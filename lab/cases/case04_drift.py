"""Case 04: the feed that repeated itself.

The "new arrivals" feed shows the newest records first, ten to a page. A collector reads it a
page at a time, and new records keep arriving while they read. Records they have already seen
come round again, and when one sells, another slips past unseen.
Run it: uv run python -m crate run 4
"""

from bisect import bisect_left
from dataclasses import dataclass

from crate.catalogue import Record, ids, make_records

LIMIT = 10


class Store:
    """The records table, with an index on id.

    newest() works like SELECT * FROM records [WHERE id < before_id] ORDER BY id DESC
    LIMIT limit OFFSET offset. The index jumps straight to before_id for free. An offset has
    no such shortcut: the store reads the skipped rows and throws them away."""

    def __init__(self, records: list[Record]) -> None:
        self.rows = sorted(records, key=lambda r: r.id)
        self.rows_read = 0
        self.next_id = self.rows[-1].id + 1 if self.rows else 1

    def add(self, record: Record) -> None:
        self.rows.append(record)
        self.next_id = record.id + 1

    def remove(self, record_id: int) -> None:
        self.rows = [r for r in self.rows if r.id != record_id]

    def newest(self, limit: int, offset: int = 0, before_id: int | None = None) -> list[Record]:
        end = (
            len(self.rows)
            if before_id is None
            else bisect_left([r.id for r in self.rows], before_id)
        )
        start = max(0, end - offset - limit)
        page = list(reversed(self.rows[start : max(0, end - offset)]))
        self.rows_read += offset + len(page)
        return page


@dataclass
class Page:
    items: list[Record]
    next: str | None  # pass this back to get the next page; None means no more


def arrivals(store: Store, cursor: str | None = None, limit: int = LIMIT) -> Page:
    """GET /arrivals?cursor=..."""
    offset = int(cursor) if cursor else 0
    items = store.newest(limit, offset=offset)
    return Page(items, str(offset + limit) if len(items) == limit else None)


def collect(store: Store, between=lambda page_number: None) -> list[Record]:
    """Read the feed to the end. `between` runs after each page: the shop does not stand still."""
    seen: list[Record] = []
    cursor = None
    number = 0
    while True:
        page = arrivals(store, cursor)
        seen.extend(page.items)
        number += 1
        if page.next is None or number >= 50:
            return seen
        between(number)
        cursor = page.next


def busy_shop() -> tuple[Store, list[Record], list[Record]]:
    """60 records. Three new ones arrive after pages 1 and 2. After page 4, three sell."""
    stock = make_records(200)
    store = Store(stock[:60])
    start = list(store.rows)
    sold: list[Record] = []

    def between(page_number: int) -> None:
        if page_number in (1, 2):
            for _ in range(3):
                store.add(stock[store.next_id - 1])
        if page_number == 4:
            for gone in [r for r in store.rows if r.id in (58, 59, 60)]:  # seen on page 1
                sold.append(gone)
                store.remove(gone.id)

    seen = collect(store, between)
    stayed = [r for r in start if r not in sold]
    return store, seen, stayed


def run() -> None:
    store, seen, stayed = busy_shop()
    twice = [r for r in stayed if seen.count(r) > 1]
    missing = [r for r in stayed if r not in seen]
    print("records when the collector started: 60  (#1 to #60)")
    print("while they read: 3 new arrivals after pages 1 and 2, 3 sales after page 4")
    print()
    print(f"rows read from the feed: {len(seen)}")
    print(f"shown twice:  {len(twice)}  ({ids(twice)})")
    print(f"never shown:  {len(missing)}  ({ids(missing)})")
    print(f"rows the store read to serve them: {store.rows_read}")
