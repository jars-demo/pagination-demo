# Every row, exactly once

A hands-on pagination workshop. Eight chapters, each explaining one idea in depth, each with a real bug in a small record shop for you to fix: offsets, limits, a stable order, cursors, cursors on a sort with ties, opaque cursors, knowing when to stop and syncing changes. **Bram**, the badger who digs through the shop's crates, quizzes you along the way.

**Workshop site:** [pagination.jishanahmed.in](https://pagination.jishanahmed.in)

## Quick start

You need [uv](https://docs.astral.sh/uv/) and git. uv installs Python 3.13 for you. The lab uses the Python standard library only: no accounts, no API keys, no Docker.

```bash
git clone https://github.com/jars-demo/pagination-demo.git
cd pagination-demo/lab
uv sync
uv run python -m crate run 1
```

## How a case works

| Command                                | What it does                                                 |
| -------------------------------------- | ------------------------------------------------------------ |
| `uv run python -m crate list`          | every case, and which ones are fixed                         |
| `uv run python -m crate run N`         | run case N and watch the bug happen                          |
| `uv run python -m crate check N`       | check your fix: every row once, in order, and cheap pages    |
| `uv run python -m crate hint N`        | a nudge from Bram                                            |
| `uv run python -m crate try deep`      | one page at five depths in SQLite, by OFFSET and by cursor   |
| `uv run python -m crate try drift`     | rows repeated and missed while a feed changes under a reader |
| `uv run python -m crate try count`     | what COUNT(*) costs next to the page itself                  |
| `uv run python -m crate try page-size` | fetch 10,000 records from a local server at four page sizes  |

Fix the code in `lab/cases/`. Start a case over with `git restore cases/` from `lab/`.

Every check walks the pages itself and tests the real promise, so a patch in the client or a feature switched off never passes.

## The chapters

| #   | Chapter                                                     | The case                            |
| --- | ----------------------------------------------------------- | ----------------------------------- |
| 01  | [Pages and offsets](workshop/01-pages-and-offsets.md)       | The first page nobody saw           |
| 02  | [Limits](workshop/02-limits.md)                             | The page with every record          |
| 03  | [A stable order](workshop/03-stable-order.md)               | Musical chairs                      |
| 04  | [Cursors](workshop/04-cursors.md)                           | The feed that repeated itself       |
| 05  | [Cursors on a sort with ties](workshop/05-keyset-ties.md)   | The price that hid records          |
| 06  | [Opaque cursors](workshop/06-opaque-cursors.md)             | The cursor that forgot the question |
| 07  | [Knowing when to stop](workshop/07-knowing-when-to-stop.md) | The client that gave up early       |
| 08  | [Syncing changes](workshop/08-syncing-changes.md)           | The update the sync never saw       |

About two and a half hours in all. The last chapter ends with a checklist.

## Layout

```text
lab/cases/            the eight cases: one real pagination bug each
lab/crate/            the CLI, the checks and the four experiments
lab/tests/            every case fails as shipped and passes with the fix in tests/solutions/
workshop/             the chapters, in Markdown
frontend/             the workshop site (Next.js), which renders workshop/
```

Run the lab's tests with `cd lab && uv run pytest`. The solutions are in `lab/tests/solutions/`: peek only when truly stuck.

## Run the site locally

```bash
cd frontend
npm ci
npm run dev
```

`npm run verify` runs lint, type checks, formatting, unit tests and a production build. For the browser tests, run `npm run build && npx next start -p 3114`, then `E2E_BASE_URL=http://localhost:3114 npm run test:e2e`.

## License

[MIT](LICENSE)
