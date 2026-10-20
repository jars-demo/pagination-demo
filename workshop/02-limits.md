# Limits

> The client chooses the page size. The server chooses what it is willing to send.

**Time:** 15 minutes

## Goal

See why a page size that comes from the client must have a default and a maximum, find the inputs that slip past a careless check, and measure how page size trades round trips against reply size.

## The case

```bash
uv run python -m crate run 2
```

```text
records in the shop: 50,000

GET /records                 200      20 records       2.0 KB
GET /records?limit=50        200      50 records       4.9 KB
GET /records?limit=1000000   200  50,000 records   4,996.5 KB
GET /records?limit=-5        200  49,995 records   4,995.9 KB
```

The first two requests are what the API was built for. The third is a scraper that asked for a million records a page and got the whole shop, five megabytes, in one reply. The fourth is a typo, and it gets almost as much. Open `lab/cases/case02_limit.py`. There is a `MAX_LIMIT` at the top. Look for where it is used.

## The limit is input

`limit` arrives in the URL, which means anyone can set it to anything. An API that trusts it hands every caller a lever on its memory, its database and its bandwidth:

- **Memory.** The server builds the whole reply before it sends it. Fifty clients asking for everything at once can exhaust it.
- **The database.** A query with no real limit reads every row, holds locks or snapshots for longer and pushes useful data out of its cache.
- **Bandwidth and cost.** Every byte leaves your network, and many hosts charge for that.
- **Everyone else.** While one huge reply is built, ordinary requests wait.

Treat `limit` like any other input: give it a **default** for when it is missing, a **maximum** it may not exceed, and a **minimum** of 1.

## The input you did not think of

Capping only the top, with `min(limit, MAX_LIMIT)`, looks like a fix and is not. In Python, `RECORDS[0:-5]` means "everything except the last five", so a limit of minus five returns 49,995 records. SQL databases differ: some reject a negative `LIMIT`, some treat it as "no limit". Either way a negative number should never reach them.

The other inputs worth a thought: `limit=0` (refuse it, or return an empty page; be consistent), `limit=abc` (a 400, never a crash), and a `limit` given twice in the same URL (pick a rule and document it).

## Refuse or clamp?

There are two honest answers to a limit outside the range:

- **Refuse** with a `400` and a message that names the range. The client learns at once that it asked for something you will not do.
- **Clamp** it into the range and return a smaller page than asked. This is kinder to sloppy clients, and it is common. Many public APIs document "at most 100, larger values are treated as 100".

Clamping only works if the client does not assume it got what it asked for. A client that asks for 1,000, gets 100 and decides "fewer than I asked for, so this is the last page" stops early. That is exactly the bug in chapter 07. Whichever you choose, write it in the documentation.

## How big should a page be?

Smaller pages mean more requests. Bigger pages mean heavier replies. Measure it on your own machine:

```bash
uv run python -m crate try page-size
```

```text
Python 3.13.16, SQLite 3.45.1, Linux, 4 CPUs

  Fetch all 10,000 records from a local server, one page after another:

  page size   requests   total time  largest reply
  10             1,000     280.3 ms         0.6 KB
  100              100      39.7 ms         5.3 KB
  1,000             10      16.9 ms        52.9 KB
  10,000             1      12.3 ms       526.6 KB

  Small pages pay for a round trip each. Past a few hundred a page the saving stops,
  and each reply only gets heavier. On a real network a round trip costs milliseconds.
```

Ten records a page took about sixteen times as long as a thousand, because each of the 1,000 requests pays a fixed cost. Going from 1,000 to 10,000 a page saved almost nothing and made the reply ten times bigger. This server is on the same machine, where a round trip takes a fraction of a millisecond. Across a real network each one costs tens of milliseconds, so tiny pages hurt far more.

For a screen, a page is what fits plus a little: 20 to 50. For a machine that wants everything, 100 to 1,000 is usually the sweet spot, and an export endpoint or a file download beats paging through millions of rows.

## Fix the case

`list_records` already checks that `limit` is a whole number. Add one more rule after that: a limit below 1 or above `MAX_LIMIT` is either refused with a `400` or brought into range. Both pass the check. Do not drop the client's choice altogether: a client that asks for 50 should still get 50.

## Check it works

```bash
uv run python -m crate check 2
```

```text
  PASS  no limit gives the default page of 20
  PASS  limit=50 gives 50 records
  PASS  limit=1000000 never returns more than 100 records (0)
  PASS  limit=-5 never returns more than 100 records (0)
  PASS  limit=abc is refused with 400, not a crash
  PASS  offset=49990&limit=100 gives the last 10 records
```

This fix refuses bad limits, so they return no records at all. A clamping fix would show 100 and 1 instead.

## Exercise

Clamp instead of refusing, or the other way round, and run the check again. Then write the one sentence you would put in the API documentation so that a client cannot misread a clamped page as the last one.

### More to try

- `offset` is input too. What does `?offset=49999999` cost this server? What would it cost a database? (Chapter 05 measures it.)
- Change the experiment's page sizes in `lab/crate/experiments.py` to 200 and 500. Where does the curve flatten on your machine?
