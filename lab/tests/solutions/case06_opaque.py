"""Case 06: the cursor that forgot the question.

A collector searches for jazz, dearest first. Page 1 is right. Like most API clients, theirs
then sends only the cursor the server handed back. Page 2 is mostly not jazz, and the prices
jump from the top of the shop to the bottom.
Run it: uv run python -m crate run 6
"""

import base64
import binascii
import json
from dataclasses import asdict, dataclass

from crate.catalogue import Record, make_records, pounds

RECORDS = make_records(240)
LIMIT = 10
SORTS = {
    "price": lambda r: (r.price, r.id),  # cheapest first
    "-price": lambda r: (-r.price, -r.id),  # dearest first
}


@dataclass
class Response:
    status: int
    body: dict


def encode(data: dict) -> str:
    """A cursor is opaque to the client: a token to hand back, not a value to build."""
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


def decode(cursor: str) -> dict:
    data = json.loads(base64.urlsafe_b64decode(cursor.encode()))
    if not isinstance(data, dict):
        raise ValueError("not a cursor")
    return data


def search(params: dict[str, str]) -> Response:
    """GET /records?genre=jazz&sort=-price, then GET /records?cursor=..."""
    genre = params.get("genre")
    sort = params.get("sort", "price")
    after = None
    if "cursor" in params:
        try:
            saved = decode(params["cursor"])
            after = tuple(saved["after"])
        except (ValueError, KeyError, TypeError, binascii.Error):
            return Response(400, {"error": "that cursor is not one of ours"})
        # The cursor carries the question. Anything sent with it must agree.
        if params.get("genre", saved.get("genre")) != saved.get("genre") or params.get(
            "sort", saved.get("sort")
        ) != saved.get("sort"):
            return Response(400, {"error": "that cursor belongs to a different search"})
        genre, sort = saved.get("genre"), saved.get("sort")
    if sort not in SORTS:
        return Response(400, {"error": f"sort must be one of {', '.join(SORTS)}"})
    key = SORTS[sort]
    rows = sorted((r for r in RECORDS if genre is None or r.genre == genre), key=key)
    if after is not None:
        rows = [r for r in rows if key(r) > after]
    items = rows[:LIMIT]
    more = len(rows) > LIMIT
    cursor = encode({"after": list(key(items[-1])), "genre": genre, "sort": sort}) if more else None
    return Response(200, {"items": [asdict(r) for r in items], "next": cursor})


def browse(first: dict[str, str], most: int = 50) -> list[list[Record]]:
    """Ask once with the full question, then follow `next`, sending only the cursor."""
    pages: list[list[Record]] = []
    params = first
    for _ in range(most):
        reply = search(params)
        if reply.status != 200:
            break
        pages.append([Record(**item) for item in reply.body["items"]])
        if reply.body["next"] is None:
            break
        params = {"cursor": reply.body["next"]}
    return pages


def run() -> None:
    pages = browse({"genre": "jazz", "sort": "-price"})
    jazz = [r for r in RECORDS if r.genre == "jazz"]
    print(f"asked for: genre=jazz, sort=-price (dearest first). {len(jazz)} jazz records in all.")
    print()
    for number, items in enumerate(pages[:3], start=1):
        genres = sum(r.genre == "jazz" for r in items)
        prices = f"{pounds(items[0].price)} to {pounds(items[-1].price)}" if items else "-"
        print(f"page {number}:  {genres:>2} of {len(items)} are jazz   prices {prices}")
    seen = [r for items in pages for r in items]
    print()
    print(
        f"pages: {len(pages)}   records shown: {len(seen)}   jazz among them: "
        f"{sum(r.genre == 'jazz' for r in seen)}"
    )
