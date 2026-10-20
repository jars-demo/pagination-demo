# Cursors on a sort with ties

> A cursor must hold the whole sort key. Hold only part of it and every tie at a page boundary becomes a trap door.

**Time:** 20 minutes

## Goal

Build a cursor for a sort column that is not unique, write the "strictly after" condition for a two-column key, and measure why the effort is worth it: a cursor page costs the same at any depth.

## The case

```bash
uv run python -m crate run 5
```

```text
pages walked:   8
records shown:  70 of 100
never shown:    30

  at  9.00:  7 hidden  (#57, #59 to #60, #73, #86, #93, #98)
  at 12.00:  1 hidden  (#97)
  at 15.00:  2 hidden  (#78, #83)
  at 22.00:  8 hidden  (#36 to #37, #39, #54, #75, #80, #91 and 1 more runs)
  at 30.00:  5 hidden  (#56, #71, #81, #92, #99)
  at 48.00:  7 hidden  (#51, #62 to #63, #77, #87 to #88, #94)
```

The shop pages through its records cheapest first, with a cursor, ten a page. A third of the shop never appears. Every hidden record costs the same as the last record on some page. Open `lab/cases/case05_ties.py`, read `cheapest`, and look at what goes into `next`.

## The trap door

The cursor is the price of the last record on the page. The next page asks for records priced above it. Here is page 1, with the seventeen records at 9.00:

```text
page 1:  #2, #5, #9 ... #50, #52: ten of the seventeen records at 9.00
cursor:  "900"
page 2:  price > 9.00, so it starts at 12.00
```

The seven records at 9.00 that did not fit on page 1 are below the cursor's price, so no later page will ever show them. The same thing happens at every page boundary that falls inside a group of equal prices.

The obvious patch, `price >= last price`, swaps the trap door for a loop. Page 2 starts again at the first record at 9.00 and shows the same ten. If more than a page of records share one price, the walk never moves past them.

## The whole key, strictly after

Chapter 03 made the order total: `ORDER BY price, id`. The cursor must be that whole key, the price **and** the id of the last row. "After" then means after in that order:

```text
(price, id) > (last_price, last_id)
```

which reads: a higher price, or the same price and a higher id. In SQL, many databases accept the pair directly, as a **row value comparison**:

```sql
SELECT * FROM records
WHERE (price, id) > (:last_price, :last_id)
ORDER BY price, id
LIMIT 10;
```

PostgreSQL and SQLite (since 3.15) support that form. Where it is missing or not used well, write it out:

```sql
WHERE price > :last_price
   OR (price = :last_price AND id > :last_id)
```

Both need an index on `(price, id)`, in that order. With it the database seeks to the exact position and reads ten rows.

## Where seniors still slip

- **Mixed directions.** `ORDER BY price DESC, id ASC` cannot use a single tuple comparison, because the two columns go opposite ways. Either make both descending (`(price, id) < (:p, :i)`), or write the `OR` form with `<` for price and `>` for id. The simplest fix is to choose matching directions on purpose.
- **NULLs.** `NULL > 900` is not true or false, it is unknown, so rows with a `NULL` price fall out of every page. Give the column a `NOT NULL` constraint, or sort by `COALESCE(price, 0)` and index that expression.
- **The cursor drifts from the ORDER BY.** Someone adds a third sort column and forgets the cursor. Build the cursor from the same list of columns as the `ORDER BY`, in one place.
- **Floating point and time zones.** A cursor that holds a rounded float or a timestamp printed in local time no longer matches the stored value exactly. Store the exact value.

## Why bother: the cost at depth

Offsets are simpler. Here is what they cost, on SQLite with an index:

```bash
uv run python -m crate try deep
```

```text
Python 3.13.16, SQLite 3.45.1, Linux, 4 CPUs

  200,000 records, 20 a page, ordered by id. One page at each depth:

  rows before the page        OFFSET      cursor   OFFSET is
  0                         0.014 ms    0.014 ms         1x
  1,000                     0.030 ms    0.014 ms         2x
  10,000                    0.093 ms    0.014 ms         6x
  100,000                   0.917 ms    0.019 ms        49x
  199,980                   2.151 ms    0.012 ms       174x

  OFFSET still reads every row it skips. The cursor seeks straight to its place.
```

The cursor page took about the same time at every depth. The offset page grew with the depth: the last page was 174 times slower than the cursor page. Two milliseconds sounds small, but it is per request, on a tiny table that fits in memory. On a real table with wide rows on disk, a deep offset reads thousands of pages of data, and a crawler that walks to the end makes the whole walk quadratic.

## Fix the case

Make `next` carry both the price and the id of the last record, in any string form you like. When a cursor comes back, split it into the two numbers, seek to that position with `store.seek`, and take only rows strictly after that exact pair. `store.seek(price, id)` starts at the first row at or after the pair you give it, so think about whether the row you seek to belongs on the new page.

## Check it works

```bash
uv run python -m crate check 5
```

```text
  PASS  walking to the end shows all 100 records exactly once (100)
  PASS  cheapest first the whole way, ties in id order
  PASS  25 records at one price, 10 a page: each shown once in 3 pages (3 pages)
```

## Exercise

Change the comparison to `>=` on the price only, without touching the cursor, and run the check. Which check fails, and how many pages does the walk take before the checker gives up? Explain the loop in one sentence.

### More to try

- Change the store so it sorts dearest first. Write the strictly-after condition for `ORDER BY price DESC, id DESC`.
- In `try deep`, change the page size from 20 to 100. Does the OFFSET column change much? Why not?
