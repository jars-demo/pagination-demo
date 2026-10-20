"""Four experiments to run on your own machine. Every number they print is measured or computed
there and then.

deep       how long one page takes at depth 0 to 199,980 in SQLite, with OFFSET and with a cursor
drift      offset and cursor paging on a feed that changes while you read it: rows seen twice,
           rows never seen
count      what "page 1 of N" costs: COUNT(*) against fetching the page, at three table sizes
page-size  a real HTTP server on localhost: fetch 10,000 records with four page sizes
"""

import http.client
import json
import os
import platform
import random
import sqlite3
import statistics
import sys
import tempfile
import threading
import time
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from crate.catalogue import GENRES, PRICES


def describe() -> str:
    python, system = sys.version.split()[0], platform.system()
    return f"Python {python}, SQLite {sqlite3.sqlite_version}, {system}, {os.cpu_count()} CPUs"


def median_time(fn: Callable[[], object], rounds: int = 7) -> float:
    """The median time for one call, in seconds."""
    times = []
    for _ in range(rounds):
        start = time.perf_counter()
        fn()
        times.append(time.perf_counter() - start)
    return statistics.median(times)


def ms(seconds: float) -> str:
    return f"{seconds * 1e3:8.3f} ms"


def fill(db: sqlite3.Connection, rows: int) -> None:
    rng = random.Random(7)
    db.execute("create table records (id integer primary key, genre text, price integer)")
    db.executemany(
        "insert into records values (?, ?, ?)",
        ((n, rng.choice(GENRES), rng.choice(PRICES)) for n in range(1, rows + 1)),
    )
    db.commit()


# deep


def deep() -> None:
    print(describe())
    print()
    rows, size = 200_000, 20
    with tempfile.TemporaryDirectory() as folder:
        db = sqlite3.connect(Path(folder, "shop.db"))
        fill(db, rows)
        print(f"  {rows:,} records, {size} a page, ordered by id. One page at each depth:")
        print()
        print(f"  {'rows before the page':<22} {'OFFSET':>11} {'cursor':>11} {'OFFSET is':>11}")
        for depth in (0, 1_000, 10_000, 100_000, 199_980):

            def offset(depth: int = depth) -> list:
                sql = "select * from records order by id limit ? offset ?"
                return db.execute(sql, (size, depth)).fetchall()

            def cursor(depth: int = depth) -> list:
                sql = "select * from records where id > ? order by id limit ?"
                return db.execute(sql, (depth, size)).fetchall()

            assert offset() == cursor()  # the same page, two ways
            slow, fast = median_time(offset), median_time(cursor)
            print(f"  {depth:<22,} {ms(slow)} {ms(fast)} {slow / fast:>9,.0f}x")
        db.close()
    print()
    print("  OFFSET still reads every row it skips. The cursor seeks straight to its place.")


# drift


def walk(
    rows: list[int], between: Callable[[list[int], list[int]], None], keyset: bool
) -> list[int]:
    """Read a newest-first feed of record ids, 20 a page, to the end. `rows` is oldest first."""
    seen: list[int] = []
    offset, before = 0, None
    while True:
        newest = rows[::-1]
        if keyset:
            page = [r for r in newest if before is None or r < before][:20]
        else:
            page = newest[offset : offset + 20]
        seen.extend(page)
        if len(page) < 20:
            return seen
        offset, before = offset + 20, page[-1]
        between(rows, seen)


def drift() -> None:
    stock = 1_000
    print(f"  A feed of {stock:,} records, newest first, read 20 a page to the end.")
    print("  Between pages the shop changes. Counted over the records there from start to end:")
    print()
    print(f"  {'between pages':<20} {'OFFSET':>17} {'cursor':>17}")
    print(f"  {'':<20} {'twice':>8} {'missed':>8} {'twice':>8} {'missed':>8}")
    for label, new, sold in [
        ("nothing changes", 0, 0),
        ("1 new record", 1, 0),
        ("5 new records", 5, 0),
        ("1 seen record sold", 0, 1),
        ("3 seen records sold", 0, 3),
    ]:
        cells = []
        for keyset in (False, True):
            rng = random.Random(f"{new}|{sold}")  # the same sales for both ways of paging

            def between(rows: list[int], seen: list[int], new=new, sold=sold, rng=rng) -> None:
                for _ in range(new):
                    rows.append(rows[-1] + 1)
                for gone in rng.sample(sorted(set(seen) & set(rows)), sold):
                    rows.remove(gone)

            rows = list(range(1, stock + 1))
            seen = walk(rows, between, keyset)
            stayed = [r for r in rows if r <= stock]  # there at the start, and still there
            twice = sum(seen.count(r) > 1 for r in stayed)
            missed = len(set(stayed) - set(seen))
            cells.append(f"{twice:>8,} {missed:>8,}")
        print(f"  {label:<20} {' '.join(cells)}")
    print()
    print("  Offsets count rows, so every change above your place shifts the next page.")
    print("  A cursor remembers the last row itself, so changes elsewhere cannot move it.")


# count


def count() -> None:
    print(describe())
    print()
    print("  To show 'page 1 of N' the server must count every match. The page itself needs 21.")
    print()
    print(f"  {'records':<11} {'COUNT(*) jazz':>13} {'first page':>13} {'count is':>10}")
    with tempfile.TemporaryDirectory() as folder:
        for rows in (10_000, 100_000, 1_000_000):
            db = sqlite3.connect(Path(folder, f"shop{rows}.db"))
            fill(db, rows)
            db.execute("create index by_genre on records (genre, id)")

            def total(db: sqlite3.Connection = db) -> int:
                return db.execute("select count(*) from records where genre = 'jazz'").fetchone()[0]

            def page(db: sqlite3.Connection = db) -> list:
                sql = "select * from records where genre = 'jazz' order by id limit 21"
                return db.execute(sql).fetchall()

            counted, paged = median_time(total), median_time(page)
            print(f"  {rows:<11,} {ms(counted):>13} {ms(paged):>13} {counted / paged:>9,.0f}x")
            db.close()
    print()
    print("  Both queries use the same index. The count grows with the table. The page does not.")


# page-size


RECORDS = [
    {"id": n, "title": f"Record {n}", "price": PRICES[n % len(PRICES)]} for n in range(1, 10_001)
]


class Api(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # keep the connection open between requests
    wbufsize = 64 * 1024  # send the headers and the body together, in one write

    def do_GET(self) -> None:
        query = parse_qs(urlsplit(self.path).query)
        after = int(query.get("after", ["0"])[0])
        limit = int(query.get("limit", ["20"])[0])
        items = RECORDS[after : after + limit]
        more = after + limit < len(RECORDS)
        body = json.dumps({"items": items, "next": items[-1]["id"] if more else None}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: object) -> None:  # keep the output clean
        pass


def page_size() -> None:
    print(describe())
    print()
    server = ThreadingHTTPServer(("127.0.0.1", 0), Api)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    client = http.client.HTTPConnection("127.0.0.1", server.server_address[1])

    def fetch_all(limit: int) -> tuple[int, int, int]:
        requests, largest, got, after = 0, 0, 0, 0
        while True:
            client.request("GET", f"/records?after={after}&limit={limit}")
            body = client.getresponse().read()
            requests += 1
            largest = max(largest, len(body))
            page = json.loads(body)
            got += len(page["items"])
            if page["next"] is None:
                return requests, largest, got
            after = page["next"]

    print(f"  Fetch all {len(RECORDS):,} records from a local server, one page after another:")
    print()
    print(f"  {'page size':<10} {'requests':>9} {'total time':>12} {'largest reply':>14}")
    for limit in (10, 100, 1_000, 10_000):
        requests, largest, got = fetch_all(limit)
        assert got == len(RECORDS)
        took = median_time(lambda limit=limit: fetch_all(limit), rounds=5)
        print(f"  {limit:<10,} {requests:>9,} {took * 1e3:>9.1f} ms {largest / 1000:>11,.1f} KB")
    client.close()
    server.shutdown()
    server.server_close()
    print()
    print("  Small pages pay for a round trip each. Past a few hundred a page the saving stops,")
    print("  and each reply only gets heavier. On a real network a round trip costs milliseconds.")


EXPERIMENTS: dict[str, Callable[[], None]] = {
    "deep": deep,
    "drift": drift,
    "count": count,
    "page-size": page_size,
}
