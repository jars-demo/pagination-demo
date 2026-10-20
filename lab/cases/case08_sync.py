"""Case 08: the update the sync never saw.

A warehouse keeps a mirror of the shop's catalogue. Every minute it asks the API for what
changed since last time, a page at a time, and remembers where it got to. By the end of the
day the mirror is missing most of the records, and one price in it is wrong for good.
Run it: uv run python -m crate run 8
"""

from dataclasses import dataclass, replace

from crate.catalogue import make_records, pounds

LIMIT = 10


class Clock:
    """A pretend clock, so the same things happen at the same moments on every run."""

    def __init__(self, now: float) -> None:
        self.now = now


@dataclass(frozen=True)
class Row:
    id: int
    title: str
    price: int
    updated_at: int  # whole seconds, like most timestamp columns in practice
    version: int  # the store adds 1 for every write, so no two writes share a version


class Store:
    def __init__(self, clock: Clock) -> None:
        self.clock = clock
        self.rows: dict[int, Row] = {}
        self.version = 0
        self.calls = 0
        self.rows_read = 0
        self.biggest_page = 0

    def write(self, record_id: int, title: str, price: int) -> None:
        self.version += 1
        self.rows[record_id] = Row(record_id, title, price, int(self.clock.now), self.version)

    def changed_since(self, column: str, value: int, limit: int) -> list[Row]:
        """GET /changes?since=...: rows WHERE column > value ORDER BY column, id LIMIT limit."""
        self.calls += 1
        if self.calls > 500:
            raise RuntimeError("the sync never finished")
        rows = sorted(
            (r for r in self.rows.values() if getattr(r, column) > value),
            key=lambda r: (getattr(r, column), r.id),
        )[:limit]
        self.rows_read += len(rows)
        self.biggest_page = max(self.biggest_page, len(rows))
        return rows


class Mirror:
    """The warehouse's copy. It remembers how far it has read, so each sync is small."""

    def __init__(self, store: Store) -> None:
        self.store = store
        self.copy: dict[int, Row] = {}
        self.since = 0

    def sync(self) -> None:
        while True:
            rows = self.store.changed_since("updated_at", self.since, LIMIT)
            for row in rows:
                self.copy[row.id] = row
            if rows:
                self.since = rows[-1].updated_at
            if len(rows) < LIMIT:
                return


def day() -> tuple[Store, Mirror]:
    clock = Clock(1000.0)
    store = Store(clock)
    for record in make_records(25):  # the morning delivery: 25 records in the same second
        store.write(record.id, record.title, record.price)
    mirror = Mirror(store)
    clock.now = 1000.4
    mirror.sync()
    clock.now = 1000.7  # a moment after the sync read, in the same second
    three = store.rows[3]
    store.write(3, three.title, three.price + 600)
    clock.now = 1060.0
    mirror.sync()
    clock.now = 1090.0
    twenty = store.rows[20]
    store.write(20, twenty.title, twenty.price - 300)
    clock.now = 1120.0
    mirror.sync()
    return store, mirror


def same(a: Row | None, b: Row) -> bool:
    return a is not None and replace(a, version=0) == replace(b, version=0)


def run() -> None:
    store, mirror = day()
    print(f"records in the shop:   {len(store.rows)}")
    print(f"records in the mirror: {len(mirror.copy)}")
    print()
    for record_id in (3, 20):
        shop, copy = store.rows[record_id], mirror.copy.get(record_id)
        mark = "same" if same(copy, shop) else "WRONG"
        print(
            f"#{record_id:<3} shop {pounds(shop.price):>5}   "
            f"mirror {pounds(copy.price) if copy else 'missing':>7}   {mark}"
        )
    print()
    print(f"the mirror's bookmark: {mirror.since}")
