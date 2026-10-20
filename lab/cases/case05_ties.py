"""Case 05: the price that hid records.

The shop pages through records cheapest first with a cursor, so new stock cannot shift the
pages. The cursor is the price of the last record on the page. Walk to the end and a third of
the shop is missing. Every missing record costs the same as the last one on some page.
Run it: uv run python -m crate run 5
"""

from bisect import bisect_left
from collections.abc import Iterator
from dataclasses import dataclass

from crate.catalogue import Record, ids, make_records, pounds

RECORDS = make_records(100)
LIMIT = 10


class Store:
    """The records table with an index on (price, id).

    seek(price, id) starts at the first row whose (price, id) is at or after the one given and
    reads forward in index order, like WHERE (price, id) >= (?, ?) ORDER BY price, id."""

    def __init__(self, records: list[Record]) -> None:
        self.rows = sorted(records, key=lambda r: (r.price, r.id))
        self.keys = [(r.price, r.id) for r in self.rows]
        self.rows_read = 0

    def seek(self, price: int, record_id: int = 0) -> Iterator[Record]:
        for row in self.rows[bisect_left(self.keys, (price, record_id)) :]:
            self.rows_read += 1
            yield row


@dataclass
class Page:
    items: list[Record]
    next: str | None


def cheapest(store: Store, cursor: str | None = None, limit: int = LIMIT) -> Page:
    """GET /records?sort=price&cursor=..."""
    after = int(cursor) if cursor else None
    items: list[Record] = []
    for row in store.seek(after if after is not None else 0):
        if after is not None and row.price <= after:
            continue  # shown on an earlier page
        items.append(row)
        if len(items) == limit:
            break
    return Page(items, str(items[-1].price) if len(items) == limit else None)


def walk(store: Store, limit: int = LIMIT, most: int = 50) -> tuple[list[Record], int]:
    """Follow the cursor to the end. Gives up after `most` pages, in case it never ends."""
    seen: list[Record] = []
    cursor = None
    for pages in range(1, most + 1):
        page = cheapest(store, cursor, limit)
        seen.extend(page.items)
        if page.next is None:
            return seen, pages
        cursor = page.next
    return seen, most


def run() -> None:
    seen, pages = walk(Store(RECORDS))
    missing = [r for r in RECORDS if r not in seen]
    print(f"pages walked:   {pages}")
    print(f"records shown:  {len(seen)} of {len(RECORDS)}")
    print(f"never shown:    {len(missing)}")
    print()
    for price in sorted({r.price for r in missing}):
        hidden = [r for r in missing if r.price == price]
        print(f"  at {pounds(price):>5}: {len(hidden):>2} hidden  ({ids(hidden)})")
