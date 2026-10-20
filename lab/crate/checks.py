"""How each case is checked. Every check takes the case module, so the tests can check a fixed
copy too. A check says what it expects in plain words.

Pagination has one promise: walk the pages to the end and you see every row exactly once, in
order, without the server doing more work than the page needs. Every check walks the pages
itself, so changing the client in the case file never fools it."""

from collections.abc import Callable
from dataclasses import replace
from types import ModuleType

from crate.catalogue import Record, make_records

Check = tuple[str, bool]


def attempt(fn: Callable[[], object]) -> object:
    """Run fn and return its result, or the exception it raised."""
    try:
        return fn()
    except Exception as error:  # a crash is an answer too
        return error


def once(seen: list[Record], expected: list[Record]) -> bool:
    """Every expected record, each exactly once, and nothing else."""
    return len(seen) == len(expected) and set(seen) == set(expected)


def check_01(m: ModuleType) -> list[Check]:
    first = attempt(lambda: m.page(m.RECORDS, 1))
    pages = attempt(lambda: m.click_through(m.RECORDS))
    odd = attempt(lambda: m.click_through(make_records(101)))
    zero = attempt(lambda: m.page(m.RECORDS, 0))
    if isinstance(pages, Exception) or isinstance(odd, Exception):
        return [(f"the pages load (they raised {pages!r})", False)]
    seen = [record for items in pages for record in items]
    return [
        ("page 1 shows the first twenty records, #1 to #20", first == m.RECORDS[:20]),
        (
            f"every page, in order, shows all 100 records once ({len(seen)} shown)",
            seen == m.RECORDS,
        ),
        ("no page is empty", all(pages)),
        (
            "with 101 records there are 6 pages, and page 6 holds just #101",
            len(odd) == 6 and [r.id for r in odd[-1]] == [101],
        ),
        ("page 0 is still refused", isinstance(zero, ValueError)),
    ]


def check_02(m: ModuleType) -> list[Check]:
    def ask(query: str) -> tuple[int | None, int]:
        reply = attempt(lambda: m.list_records(dict(p.split("=") for p in query.split("&") if p)))
        if isinstance(reply, Exception):
            return None, 0
        return reply.status, len(reply.body.get("items", [])) if reply.status == 200 else 0

    def small(query: str) -> tuple[bool, int]:
        status, count = ask(query)
        return status is not None and count <= m.MAX_LIMIT, count

    huge, huge_count = small("limit=1000000")
    minus, minus_count = small("limit=-5")
    last = attempt(lambda: m.list_records({"offset": "49990", "limit": "100"}))
    last_ids = (
        [item["id"] for item in last.body["items"]] if not isinstance(last, Exception) else []
    )
    return [
        ("no limit gives the default page of 20", ask("") == (200, 20)),
        ("limit=50 gives 50 records", ask("limit=50") == (200, 50)),
        (f"limit=1000000 never returns more than 100 records ({huge_count:,})", huge),
        (f"limit=-5 never returns more than 100 records ({minus_count:,})", minus),
        ("limit=abc is refused with 400, not a crash", ask("limit=abc")[0] == 400),
        ("offset=49990&limit=100 gives the last 10 records", last_ids == list(range(49991, 50001))),
    ]


def check_03(m: ModuleType) -> list[Check]:
    db = m.Database(m.RECORDS)
    shop = m.Shop(db)
    seen = attempt(lambda: [r for n in range(1, 6) for r in shop.cheapest(n)])
    if isinstance(seen, Exception):
        return [(f"the pages load (they raised {seen!r})", False)]
    queries, rows = db.queries, db.rows_returned
    prices = [r.price for r in seen]
    first, again = shop.cheapest(2), shop.cheapest(2)
    alike = [replace(r, title="Blue Train", artist="The Lanterns", price=1500) for r in m.RECORDS]
    twins = m.Shop(m.Database(alike))
    seen_twins = attempt(lambda: [r for n in range(1, 6) for r in twins.cheapest(n)])
    return [
        (
            f"five pages show all 100 records exactly once ({len(set(seen))} different)",
            once(seen, m.RECORDS),
        ),
        ("cheapest first, on every page and across pages", prices == sorted(prices)),
        ("page 2 asked twice gives the same records in the same order", first == again),
        (
            "100 copies of one record at one price still show once each",
            isinstance(seen_twins, list) and once(seen_twins, alike),
        ),
        (
            f"each page is one query for 20 rows ({queries} queries, {rows} rows)",
            queries == 5 and rows == 100,
        ),
    ]


def walk_feed(m: ModuleType, store, between: Callable[[int], None]) -> tuple[list, list[int]]:
    """Read the arrivals feed to the end, and the rows the store read for each page."""
    seen: list[Record] = []
    costs: list[int] = []
    cursor = None
    for number in range(1, 51):
        before = store.rows_read
        page = m.arrivals(store, cursor)
        costs.append(store.rows_read - before)
        seen.extend(page.items)
        if page.next is None:
            break
        between(number)
        cursor = page.next
    return seen, costs


def check_04(m: ModuleType) -> list[Check]:
    stock = make_records(200)

    def arriving() -> tuple[list[Record], list[Record], list[int]]:
        store = m.Store(stock[:60])

        def between(number: int) -> None:
            if number <= 4:
                for _ in range(3):
                    store.add(stock[store.next_id - 1])

        seen, costs = walk_feed(m, store, between)
        return seen, stock[:60], costs

    def selling() -> tuple[list[Record], list[Record], list[int]]:
        store = m.Store(stock[:60])

        def between(number: int) -> None:
            if number == 2:
                for record_id in (58, 59, 60):  # seen on page 1
                    store.remove(record_id)

        seen, costs = walk_feed(m, store, between)
        return seen, stock[:57], costs

    first = attempt(arriving)
    second = attempt(selling)
    if isinstance(first, Exception) or isinstance(second, Exception):
        return [("the feed loads while the shop changes", False)]
    seen, stayed, costs = first
    seen_two, stayed_two, costs_two = second
    old = [r for r in seen if r in stayed]
    old_two = [r for r in seen_two if r in stayed_two or r.id in (58, 59, 60)]
    newest_first = all(a.id > b.id for a, b in zip(seen, seen[1:], strict=False))
    deepest = max(costs + costs_two)
    return [
        ("with 12 new arrivals while reading, each of the 60 is shown once", once(old, stayed)),
        (
            "with 3 sales while reading, none of the others is skipped",
            once(old_two, stayed_two + stock[57:60]),
        ),
        ("newest first, across the whole walk", newest_first),
        (
            f"a deep page reads no more rows than a first page (most for one page: {deepest})",
            deepest <= 11,
        ),
    ]


def check_05(m: ModuleType) -> list[Check]:
    def walk(store) -> tuple[list[Record], int]:
        seen: list[Record] = []
        cursor = None
        for pages in range(1, 51):
            page = m.cheapest(store, cursor)
            seen.extend(page.items)
            if page.next is None:
                return seen, pages
            cursor = page.next
        return seen, 50

    result = attempt(lambda: walk(m.Store(m.RECORDS)))
    same_price = [replace(r, price=1500) for r in make_records(25)]
    tied = attempt(lambda: walk(m.Store(same_price)))
    if isinstance(result, Exception) or isinstance(tied, Exception):
        return [(f"the pages load (they raised {result!r})", False)]
    seen, _ = result
    seen_tied, pages = tied
    keys = [(r.price, r.id) for r in seen]
    return [
        (
            f"walking to the end shows all 100 records exactly once ({len(set(seen))})",
            once(seen, m.RECORDS),
        ),
        ("cheapest first the whole way, ties in id order", keys == sorted(keys)),
        (
            f"25 records at one price, 10 a page: each shown once in 3 pages ({pages} pages)",
            once(seen_tied, same_price) and pages == 3,
        ),
    ]


def check_06(m: ModuleType) -> list[Check]:
    def walk(first: dict[str, str], repeat: bool = False) -> list[int] | None:
        seen: list[int] = []
        params = first
        for _ in range(50):
            reply = m.search(params)
            if reply.status != 200:
                return None
            seen.extend(item["id"] for item in reply.body["items"])
            if reply.body["next"] is None:
                return seen
            params = {**(first if repeat else {}), "cursor": reply.body["next"]}
        return None

    def wanted(genre: str, dearest: bool) -> list[int]:
        rows = [r for r in m.RECORDS if r.genre == genre]
        rows.sort(key=lambda r: (r.price, r.id), reverse=dearest)
        return [r.id for r in rows]

    jazz = {"genre": "jazz", "sort": "-price"}
    walked = attempt(lambda: walk(jazz))
    soul = attempt(lambda: walk({"genre": "soul", "sort": "price"}))
    repeated = attempt(lambda: walk(jazz, repeat=True))
    first = attempt(lambda: m.search(jazz))
    mixed = attempt(lambda: m.search({"genre": "rock", "cursor": first.body["next"]}))
    junk = attempt(lambda: m.search({"cursor": "not-a-cursor"}))
    return [
        (
            "sending only the cursor walks every jazz record once, dearest first",
            walked == wanted("jazz", dearest=True),
        ),
        ("the same for soul, cheapest first", soul == wanted("soul", dearest=False)),
        (
            "sending the same genre and sort with the cursor still works",
            repeated == wanted("jazz", dearest=True),
        ),
        (
            "a jazz cursor sent with genre=rock is refused with 400",
            getattr(mixed, "status", None) == 400,
        ),
        (
            "a cursor that is not ours is refused with 400, not a crash",
            getattr(junk, "status", None) == 400,
        ),
    ]


def check_07(m: ModuleType) -> list[Check]:
    def server(pages: list[list[Record]]) -> tuple[Callable, list[str | None]]:
        """A pretend server with these pages. It counts requests, and stops a runaway loop."""
        asked: list[str | None] = []

        def fetch(cursor: str | None):
            asked.append(cursor)
            if len(asked) > 100:
                raise RuntimeError("the client never stopped")
            index = int(cursor) if cursor else 0
            if index >= len(pages):
                raise RuntimeError("the client asked past the last page")
            more = index + 1 < len(pages)
            return m.Page(pages[index], str(index + 1) if more else None)

        return fetch, asked

    asked: list[str | None] = []

    def real(cursor: str | None):
        asked.append(cursor)
        if len(asked) > 100:
            raise RuntimeError("the client never stopped")
        return m.catalogue(cursor)

    saved = attempt(lambda: m.download_all(real))
    for_sale = [r for r in m.RECORDS if m.on_sale(r)]
    stock = make_records(5)
    gappy, gappy_asked = server([stock[:3], [], stock[3:]])
    gaps = attempt(lambda: m.download_all(gappy))
    short, short_asked = server([stock[:2]])
    alone = attempt(lambda: m.download_all(short))
    count = len(saved) if isinstance(saved, list) else 0
    return [
        (
            f"every record for sale is downloaded, once ({count} of {len(for_sale)})",
            saved == for_sale,
        ),
        (f"it stops when next is None: 12 requests, no more ({len(asked)})", len(asked) == 12),
        (
            "an empty page in the middle does not stop it",
            gaps == stock and len(gappy_asked) == 3,
        ),
        (
            "a single short last page takes one request",
            alone == stock[:2] and len(short_asked) == 1,
        ),
    ]


def check_08(m: ModuleType) -> list[Check]:
    def matches(copy: dict, rows: dict) -> bool:
        def plain(row) -> tuple:
            return row.id, row.title, row.price

        return {k: plain(v) for k, v in copy.items()} == {k: plain(v) for k, v in rows.items()}

    result = attempt(m.day)
    if isinstance(result, Exception):
        return [(f"the day runs (it raised {result!r})", False)]
    store, mirror = result

    def burst():
        clock = m.Clock(2000.0)
        busy = m.Store(clock)
        for record in make_records(30):
            busy.write(record.id, record.title, record.price)
        copy = m.Mirror(busy)
        clock.now = 2000.5
        copy.sync()
        return busy, copy

    second = attempt(burst)
    if isinstance(second, Exception):
        return [(f"a burst of 30 changes syncs (it raised {second!r})", False)]
    busy, copy = second
    read = busy.rows_read
    quiet = attempt(copy.sync)
    biggest = max(store.biggest_page, busy.biggest_page)
    return [
        (
            f"after the day the mirror holds all 25 records at today's prices ({len(mirror.copy)})",
            matches(mirror.copy, store.rows),
        ),
        (
            f"30 changes in one second are all copied ({len(copy.copy)})",
            matches(copy.copy, busy.rows),
        ),
        (
            "a sync with nothing new reads no rows",
            not isinstance(quiet, Exception) and busy.rows_read == read,
        ),
        (
            f"it still reads 10 rows a page at most (largest {biggest})",
            biggest <= 10,
        ),
    ]


CHECKS: dict[int, Callable[[ModuleType], list[Check]]] = {
    1: check_01,
    2: check_02,
    3: check_03,
    4: check_04,
    5: check_05,
    6: check_06,
    7: check_07,
    8: check_08,
}
