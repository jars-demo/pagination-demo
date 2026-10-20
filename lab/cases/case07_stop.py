"""Case 07: the client that gave up early.

A partner downloads the whole catalogue every night through the API. Last night it saved 18
records and reported success. The shop has 189 records for sale. The server did nothing
wrong: its documentation says a page can hold fewer records than the limit, even none.
Run it: uv run python -m crate run 7
"""

from collections.abc import Callable
from dataclasses import dataclass

from crate.catalogue import Record, make_records

LIMIT = 20
RECORDS = make_records(240)


def on_sale(record: Record) -> bool:
    """Every seventh record is on hold for a customer, and #101 to #120 are out for a stock-take."""
    return record.id % 7 != 0 and not 101 <= record.id <= 120


@dataclass
class Page:
    items: list[Record]
    next: str | None


def catalogue(cursor: str | None = None) -> Page:
    """GET /catalogue?cursor=... The server reads LIMIT rows after the cursor, then drops the
    ones that are not for sale. So a page can be short, or empty, and still not be the last.
    Only next = None means the end."""
    after = int(cursor) if cursor else 0
    rows = [r for r in RECORDS if r.id > after][:LIMIT]
    more = bool(rows) and rows[-1].id < RECORDS[-1].id
    return Page([r for r in rows if on_sale(r)], str(rows[-1].id) if more else None)


def download_all(fetch: Callable[[str | None], Page]) -> list[Record]:
    """The partner's nightly job: fetch every page and keep every record."""
    saved: list[Record] = []
    cursor = None
    while True:
        page = fetch(cursor)
        saved.extend(page.items)
        if len(page.items) < LIMIT:
            break  # a short page must be the last one
        cursor = page.next
    return saved


def run() -> None:
    requests: list[Page] = []

    def fetch(cursor: str | None) -> Page:
        requests.append(catalogue(cursor))
        return requests[-1]

    saved = download_all(fetch)
    total = sum(on_sale(r) for r in RECORDS)
    print(f"records for sale:   {total}")
    print(f"records downloaded: {len(saved)}")
    print(f"requests made:      {len(requests)}")
    print(f"last reply:         {len(requests[-1].items)} records, next = {requests[-1].next!r}")
