"""The checks test the goal, not the shape of one fix. Each case is edited into plausible wrong
fixes, which must fail, and into other right fixes, which must pass."""

import sys
import types
from pathlib import Path

import pytest

from crate.__main__ import CASES
from crate.checks import CHECKS

LAB = Path(__file__).resolve().parent.parent


def variant(number: int, edits: list[tuple[str, str]]) -> types.ModuleType:
    name = CASES[number][0]
    source = (LAB / "cases" / f"{name}.py").read_text(encoding="utf-8")
    for old, new in edits:
        assert old in source, f"{name} no longer contains {old!r}"
        source = source.replace(old, new)
    module = types.ModuleType(f"variant_{name}")
    sys.modules[module.__name__] = module  # dataclasses look their module up
    try:
        exec(compile(source, f"{name} (variant)", "exec"), module.__dict__)
    finally:
        del sys.modules[module.__name__]
    return module


def passes(number: int, edits: list[tuple[str, str]]) -> bool:
    return all(ok for _, ok in CHECKS[number](variant(number, edits)))


WRONG = {
    "01 start the walk at page 0": (
        1,
        [("range(1, page_count", "range(0, page_count")],
    ),
    "01 show one more page": (
        1,
        [("math.ceil(len(records) / size)", "math.ceil(len(records) / size) + 1")],
    ),
    "01 drop the guard and count from 0": (
        1,
        [
            ("    if number < 1:\n", "    if number < 0:\n"),
            ("range(1, page_count(records, size) + 1)", "range(0, page_count(records, size))"),
        ],
    ),
    "02 cap only the top": (
        2,
        [("RECORDS[offset : offset + limit]", "RECORDS[offset : offset + min(limit, MAX_LIMIT)]")],
    ),
    "02 ignore the limit": (
        2,
        [("    items = RECORDS[", "    limit = DEFAULT_LIMIT\n    items = RECORDS[")],
    ),
    "03 order by id": (3, [('order_by=("price",)', 'order_by=("id",)')]),
    "03 break ties by title, which repeats": (
        3,
        [('order_by=("price",)', 'order_by=("price", "title")')],
    ),
    "03 fetch everything and slice": (
        3,
        [
            (
                'return self.db.select(order_by=("price",), offset=(number - 1) * size, '
                "limit=size)",
                'rows = sorted(self.db.select(("id",), 0, 1000), key=lambda r: (r.price, r.id))\n'
                "        return rows[(number - 1) * size : number * size]",
            )
        ],
    ),
    "04 cursor one row too late": (
        4,
        [
            (
                "offset = int(cursor) if cursor else 0",
                "before = int(cursor) + 1 if cursor else None",
            ),
            ("store.newest(limit, offset=offset)", "store.newest(limit, before_id=before)"),
            ("str(offset + limit) if", "str(items[-1].id) if"),
        ],
    ),
    "04 keyset but still an offset": (
        4,
        [
            (
                "items = store.newest(limit, offset=offset)",
                "items = [r for r in store.newest(offset + limit) if not cursor or r.id < offset]"
                "[:limit]",
            ),
        ],
    ),
    "05 use >= for the price": (5, [("row.price <= after", "row.price < after")]),
    "05 make the cursor the last id": (
        5,
        [
            ("store.seek(after if after is not None else 0)", "store.seek(0)"),
            ("row.price <= after", "row.id <= after"),
            ("str(items[-1].price) if", "str(items[-1].id) if"),
        ],
    ),
    "06 dearest first by default": (
        6,
        [('params.get("sort", "price")', 'params.get("sort", "-price")')],
    ),
    "06 the cursor keeps the sort but not the genre": (
        6,
        [
            (
                'after = tuple(decode(params["cursor"])["after"])',
                'saved = decode(params["cursor"])\n'
                '            after = tuple(saved["after"])\n'
                '            sort = saved["sort"]',
            ),
            (
                'encode({"after": list(key(items[-1]))})',
                'encode({"after": list(key(items[-1])), "sort": sort})',
            ),
        ],
    ),
    "06 the client resends the question": (
        6,
        [
            (
                'params = {"cursor": reply.body["next"]}',
                'params = {**first, "cursor": reply.body["next"]}',
            )
        ],
    ),
    "07 stop on an empty page": (7, [("if len(page.items) < LIMIT:", "if not page.items:")]),
    "07 stop on either": (
        7,
        [("if len(page.items) < LIMIT:", "if page.next is None or len(page.items) < LIMIT:")],
    ),
    "08 step back one second": (
        8,
        [("self.since = rows[-1].updated_at", "self.since = rows[-1].updated_at - 1")],
    ),
    "08 read everything every time": (
        8,
        [
            (
                "            if rows:\n                self.since",
                "            if False:\n                self.since",
            )
        ],
    ),
    "08 one huge page": (8, [("LIMIT = 10\n", "LIMIT = 1000\n")]),
}

RIGHT = {
    "01 subtract a page": (1, [("start = number * size", "start = number * size - size")]),
    "02 clamp into range": (
        2,
        [
            (
                "    items = RECORDS[",
                "    limit = max(1, min(limit, MAX_LIMIT))\n    items = RECORDS[",
            )
        ],
    ),
    "03 artist then id": (3, [('order_by=("price",)', 'order_by=("price", "artist", "id")')]),
    "04 keyset, asking for one extra row": (
        4,
        [
            (
                "offset = int(cursor) if cursor else 0\n"
                "    items = store.newest(limit, offset=offset)\n"
                "    return Page(items, str(offset + limit) if len(items) == limit else None)",
                "rows = store.newest(limit + 1, before_id=int(cursor) if cursor else None)\n"
                "    items = rows[:limit]\n"
                "    return Page(items, str(items[-1].id) if len(rows) > limit else None)",
            )
        ],
    ),
    "05 compare tuples after a price seek": (
        5,
        [
            (
                "after = int(cursor) if cursor else None",
                "after = tuple(map(int, cursor.split(':'))) if cursor else None",
            ),
            (
                "store.seek(after if after is not None else 0)",
                "store.seek(after[0] if after else 0)",
            ),
            ("row.price <= after", "(row.price, row.id) <= after"),
            ("str(items[-1].price) if", "f'{items[-1].price}:{items[-1].id}' if"),
        ],
    ),
    "07 loop while there is a cursor": (
        7,
        [
            (
                "        if len(page.items) < LIMIT:\n"
                "            break  # a short page must be the last one\n"
                "        cursor = page.next",
                "        cursor = page.next\n        if not cursor:\n            break",
            ),
        ],
    ),
    "08 keep the highest version": (
        8,
        [
            (
                'changed_since("updated_at", self.since, LIMIT)',
                'changed_since("version", self.since, LIMIT)',
            ),
            ("self.since = rows[-1].updated_at", "self.since = max(r.version for r in rows)"),
        ],
    ),
}


@pytest.mark.parametrize("name", list(WRONG))
def test_a_wrong_fix_fails(name):
    number, edits = WRONG[name]

    assert not passes(number, edits)


@pytest.mark.parametrize("name", list(RIGHT))
def test_another_right_fix_passes(name):
    number, edits = RIGHT[name]

    failed = [label for label, ok in CHECKS[number](variant(number, edits)) if not ok]

    assert failed == []
