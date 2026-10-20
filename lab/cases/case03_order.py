"""Case 03: musical chairs.

The shop lists records cheapest first, twenty to a page. Walk all five pages and some records
turn up twice while others never turn up at all. Ask for the same page twice and you get
different records. Nothing was added or removed in between.
Run it: uv run python -m crate run 3
"""

import random
from itertools import groupby

from crate.catalogue import Record, ids, make_records

RECORDS = make_records(100)
PAGE_SIZE = 20


class Database:
    """Works like SELECT * FROM records ORDER BY ... LIMIT ... OFFSET ...

    Rows that tie on every ORDER BY column come back in no promised order. A real database is
    the same: the order of ties depends on the plan, the memory it has and the pages it read,
    and it can change between two runs of the same query. This one shuffles ties with a seed
    taken from the query, so you see the same surprise on every run."""

    def __init__(self, records: list[Record]) -> None:
        self.records = records
        self.queries = 0
        self.rows_returned = 0

    def select(self, order_by: tuple[str, ...], offset: int, limit: int) -> list[Record]:
        self.queries += 1

        def key(row: Record) -> tuple:
            return tuple(getattr(row, column) for column in order_by)

        ties = random.Random(f"{self.queries}|{order_by}|{offset}|{limit}")
        rows: list[Record] = []
        for _, group in groupby(sorted(self.records, key=key), key=key):
            tied = list(group)
            ties.shuffle(tied)
            rows.extend(tied)
        page = rows[offset : offset + limit]
        self.rows_returned += len(page)
        return page


class Shop:
    def __init__(self, db: Database) -> None:
        self.db = db

    def cheapest(self, number: int, size: int = PAGE_SIZE) -> list[Record]:
        """Page `number` (from 1) of the records, cheapest first."""
        return self.db.select(order_by=("price",), offset=(number - 1) * size, limit=size)


def walk(shop: Shop, pages: int = 5) -> list[Record]:
    return [record for n in range(1, pages + 1) for record in shop.cheapest(n)]


def run() -> None:
    shop = Shop(Database(RECORDS))
    seen = walk(shop)
    twice = sorted({r.id for r in seen if seen.count(r) > 1})
    missing = [r for r in RECORDS if r not in seen]
    print(f"pages walked:      5, {PAGE_SIZE} records a page")
    print(f"rows shown:        {len(seen)}")
    print(f"different records: {len(set(seen))}")
    print(f"shown twice:       {len(twice)}")
    print(f"never shown:       {len(missing)}  ({ids(missing)})")
    first = {r.id for r in shop.cheapest(2)}
    again = {r.id for r in shop.cheapest(2)}
    print()
    print(f"page 2, asked twice: {len(first - again)} of {PAGE_SIZE} records changed")
