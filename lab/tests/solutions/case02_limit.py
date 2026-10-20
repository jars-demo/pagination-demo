"""Case 02: the page with every record.

The shop's API returns records a page at a time, twenty by default. A scraper asks for a
million per page and gets the whole shop in one reply. A typo asks for minus five and gets
nearly all of it too. One request, megabytes of JSON, and the shop pays for every byte.
Run it: uv run python -m crate run 2
"""

import json
from dataclasses import asdict, dataclass

from crate.catalogue import make_records

RECORDS = make_records(50_000)
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@dataclass
class Response:
    status: int
    body: dict

    def size(self) -> int:
        return len(json.dumps(self.body).encode())


def list_records(query: dict[str, str]) -> Response:
    """GET /records?offset=0&limit=20"""
    try:
        offset = int(query.get("offset", "0"))
        limit = int(query.get("limit", str(DEFAULT_LIMIT)))
    except ValueError:
        return Response(400, {"error": "offset and limit must be whole numbers"})
    if offset < 0:
        return Response(400, {"error": "offset cannot be negative"})
    if not 1 <= limit <= MAX_LIMIT:
        return Response(400, {"error": f"limit must be between 1 and {MAX_LIMIT}"})
    items = RECORDS[offset : offset + limit]
    return Response(200, {"items": [asdict(r) for r in items], "offset": offset, "limit": limit})


ASKED = ["", "limit=50", "limit=1000000", "limit=-5"]


def run() -> None:
    print(f"records in the shop: {len(RECORDS):,}")
    print()
    for asked in ASKED:
        query = dict(part.split("=") for part in asked.split("&") if part)
        reply = list_records(query)
        count = len(reply.body.get("items", []))
        url = "GET /records" + (f"?{asked}" if asked else "")
        print(f"{url:<28} {reply.status}  {count:>6,} records  {reply.size() / 1000:>8,.1f} KB")
