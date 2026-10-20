# AGENTS.md

Guidance for coding agents and developers. Humans: start with [README.md](README.md).

## What this is

"Every row, exactly once": eight chapters, each a pagination idea explained in depth and a real bug in a small record shop that shows it. `lab/` holds the cases and the checker; `workshop/` the chapters; `frontend/` the site.

## Map

```text
lab/crate/catalogue.py      the shop's records, seeded so every run sees the same shop
lab/cases/caseNN_*.py       one deliberate pagination bug each; run() shows the symptom
lab/crate/checks.py         check_NN(module) -> [(label, ok)]; walks the pages itself
lab/crate/experiments.py    `crate try deep | drift | count | page-size`
lab/crate/__main__.py       CLI: list, run, check, hint, try; case titles live here
lab/tests/                  each case fails as shipped, passes with tests/solutions/,
                            and rejects plausible wrong fixes (test_mutations.py)
frontend/src/lib/site.ts    cases and measured numbers: every value is real lab output
frontend/src/lib/feed.ts    the moving feed simulator's rules, unit tested
frontend/src/lib/bram.ts    Bram's note and quiz for each page
frontend/src/lib/tokens.ts  colour pairs; a test checks them against globals.css and WCAG AA
```

## Commands

```bash
cd lab && uv sync && uv run pytest && uv run ruff check . && uv run ruff format --check .
cd frontend && npm ci && npm run verify
cd frontend && npm run build && npx next start -p 3114   # then, in another shell:
E2E_BASE_URL=http://localhost:3114 npm run test:e2e
```

Set `CHROMIUM_PATH` to use an installed Chromium if Playwright's own is missing.

## Rules

1. **The bugs are the product.** Never fix a bug in `lab/cases/`. Change a case, its check and its solution together, and keep `test_case_is_broken_as_shipped` passing.
2. **Checks test the promise.** Every row exactly once, in order, without extra work. Checks walk the pages themselves, so a client-side patch never passes. Add a wrong fix to `test_mutations.py` when you find one that slips through.
3. **Bugs must be deterministic.** Use seeded randomness, pretend clocks and scripted events, never timing luck.
4. **Standard library only** in `lab/`. Pin exact versions everywhere else.
5. **Every number is real.** Output and timings in chapters and on the site come from real runs, and unit tests compare the site's numbers with the chapters. Rerun and update both together.
6. **Colours mean one thing.** Green is a row seen once or a pass, blue a row seen twice, red a row missed or a failure, yellow where you are. Always pair colour with an icon and a word.
7. **Writing style.** Plain English, short sentences, no em dashes. Conventional Commits with imperative, capitalised subjects.
