"""crate: eight pagination bugs in one small record shop.

list        every case, and which ones are fixed
run N       run case N and watch the bug happen
check N     check your fix: every record once, in order, and cheap pages
hint N      a nudge from Bram
try NAME    run an experiment: deep, drift, count or page-size
"""

import argparse
import importlib
import sys

from crate.checks import CHECKS
from crate.experiments import EXPERIMENTS

CASES = {
    1: ("case01_offset", "The first page nobody saw"),
    2: ("case02_limit", "The page with every record"),
    3: ("case03_order", "Musical chairs"),
    4: ("case04_drift", "The feed that repeated itself"),
    5: ("case05_ties", "The price that hid records"),
    6: ("case06_opaque", "The cursor that forgot the question"),
    7: ("case07_stop", "The client that gave up early"),
    8: ("case08_sync", "The update the sync never saw"),
}

HINTS = {
    1: [
        "Page 1 starts at #21. Which record should it start at?",
        "Work out the first index for page 1, page 2 and page 3 by hand.",
        "Page numbers start at 1 and list indexes start at 0: start = (number - 1) * size.",
    ],
    2: [
        "MAX_LIMIT is defined at the top. Where is it used?",
        "What does RECORDS[0:-5] give you in Python?",
        "Refuse any limit outside 1 to MAX_LIMIT with a 400, or clamp it into that range.",
    ],
    3: [
        "Many records share a price. Which order do they come back in?",
        "ORDER BY price does not say what to do with ties, so the database may pick any order.",
        "Add a unique column as the last tie-breaker: order_by=('price', 'id').",
    ],
    4: [
        "The cursor is an offset: skip this many rows. What happens to the rows when one arrives?",
        "Remember where you were by the last row you saw, not by how many rows came before it.",
        "Make the cursor the last id on the page, and ask store.newest(limit, before_id=...).",
    ],
    5: [
        "The cursor is the last price. How many records share that price?",
        "'price > last price' skips the rest of a tie. 'price >= last price' repeats it forever.",
        "Make the cursor the whole sort key, price and id, and seek strictly after that pair.",
    ],
    6: [
        "Decode a cursor: base64 then JSON. What is inside it, and what is missing?",
        "On page 2 the client sends only the cursor. Where should genre and sort come from?",
        "Put genre and sort into the cursor, use them, and refuse params that disagree with it.",
    ],
    7: [
        "Read the server's docstring for catalogue(). When is a page the last one?",
        "A page can be short, or empty, and still have a next cursor.",
        "Stop when page.next is None, and only then.",
    ],
    8: [
        "25 records were written in the same second. How many fit in one page?",
        "updated_at has whole seconds, and a write can land after you read, in the same second.",
        "Page by version, which no two writes share and which only goes up, and keep it as since.",
    ],
}


def say(text: str) -> None:
    print("    .---.")
    print(f"   ( o o )   {text}")
    print("    \\_=_/", flush=True)


def module(number: int):
    name = f"cases.{CASES[number][0]}"
    sys.modules.pop(name, None)  # always the code as it is on disk now
    return importlib.import_module(name)


def fixed(number: int) -> bool:
    return all(ok for _, ok in CHECKS[number](module(number)))


def cmd_list(args: argparse.Namespace) -> None:
    for number, (_, title) in CASES.items():
        print(f"  {number}  {title:<40} {'fixed' if fixed(number) else ''}", flush=True)


def cmd_run(args: argparse.Namespace) -> None:
    say(f"Case {args.n}: {CASES[args.n][1]}.")
    print()
    module(args.n).run()


def cmd_check(args: argparse.Namespace) -> None:
    results = CHECKS[args.n](module(args.n))
    for label, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {label}")
    print()
    if all(ok for _, ok in results):
        say(f"Case {args.n} fixed. Every row, exactly once.")
    else:
        say(f"Not yet. Try: uv run python -m crate hint {args.n}")
        sys.exit(1)


def cmd_hint(args: argparse.Namespace) -> None:
    say("Here is where I would dig:")
    for hint in HINTS[args.n]:
        print(f"  - {hint}")


def cmd_try(args: argparse.Namespace) -> None:
    EXPERIMENTS[args.name]()


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # the same output on every terminal
    parser = argparse.ArgumentParser(prog="crate", description="Eight pagination bugs.")
    sub = parser.add_subparsers(required=True)
    sub.add_parser("list", help="every case and which are fixed").set_defaults(func=cmd_list)
    for name, func, text in [
        ("run", cmd_run, "run case N and watch the bug"),
        ("check", cmd_check, "check your fix"),
        ("hint", cmd_hint, "a nudge from Bram"),
    ]:
        p = sub.add_parser(name, help=text)
        p.add_argument("n", type=int, choices=CASES, metavar="N")
        p.set_defaults(func=func)
    p = sub.add_parser("try", help="run an experiment: " + ", ".join(EXPERIMENTS))
    p.add_argument("name", choices=EXPERIMENTS)
    p.set_defaults(func=cmd_try)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
