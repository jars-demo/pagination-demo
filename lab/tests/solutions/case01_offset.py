"""Case 01: the first page nobody saw.

The shop lists its 100 records twenty to a page, with page numbers 1 to 5 under the list.
Click through every page and twenty records never appear, and the last page comes back empty.
Run it: uv run python -m crate run 1
"""

import math

from crate.catalogue import Record, ids, make_records

RECORDS = make_records(100)  # in the order they were added: #1 first
PAGE_SIZE = 20


def page_count(records: list[Record], size: int = PAGE_SIZE) -> int:
    return math.ceil(len(records) / size)


def page(records: list[Record], number: int, size: int = PAGE_SIZE) -> list[Record]:
    """Page `number` of the list. Page numbers start at 1, the way people count."""
    if number < 1:
        raise ValueError(f"there is no page {number}: pages start at 1")
    start = (number - 1) * size
    return records[start : start + size]


def click_through(records: list[Record] = RECORDS, size: int = PAGE_SIZE) -> list[list[Record]]:
    """A visitor clicks page 1, then 2, and so on to the last page number shown."""
    return [page(records, n, size) for n in range(1, page_count(records, size) + 1)]


def run() -> None:
    pages = click_through()
    for number, items in enumerate(pages, start=1):
        shown = f"#{items[0].id} to #{items[-1].id}" if items else "(empty)"
        print(f"page {number}:  {shown}")
    seen = [record for items in pages for record in items]
    missing = [record for record in RECORDS if record not in seen]
    print()
    print(f"records in the shop: {len(RECORDS)}")
    print(f"records shown:       {len(seen)}")
    print(f"never shown:         {ids(missing)}")
