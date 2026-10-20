# Cursors

> An offset remembers how many rows came before you. A cursor remembers the row you stopped at. Only one of those survives a busy shop.

**Time:** 25 minutes

## Goal

See why offset pages repeat and skip rows when the data changes between requests, replace the offset with a cursor that remembers the last row seen, and know what you give up in exchange.

## The case

```bash
uv run python -m crate run 4
```

```text
records when the collector started: 60  (#1 to #60)
while they read: 3 new arrivals after pages 1 and 2, 3 sales after page 4

rows read from the feed: 63
shown twice:  6  (#44 to #46, #51 to #53)
never shown:  3  (#24 to #26)
rows the store read to serve them: 273
```

The "new arrivals" feed shows the newest records first, ten a page. While a collector reads it, six new records arrive and three they have already seen are sold. Six records come round twice and three are never shown. Open `lab/cases/case04_drift.py` and read `arrivals`. The cursor it hands back is a number. Work out what that number means.

## Why offsets drift

An offset says "skip the first 10 rows". It does not say which rows those were. The list is newest first, so every new arrival goes on top and pushes everything down by one:

```text
page 1, offset 0:   #60 #59 ... #51          the collector reads these
three records arrive: #61 #62 #63 go on top
page 2, offset 10:  #53 #52 #51 #50 ... #44  #53, #52 and #51 again
```

Three arrivals, three repeats. A removal does the opposite: everything below it moves up by one, and the row that slides across the boundary is never shown. In the run, three sales after page 4 hid #24 to #26.

This is not a rare race. It happens whenever anything changes above the reader's position, on every busy list: feeds, inboxes, order queues, search results that refresh. Measure how often:

```bash
uv run python -m crate try drift
```

```text
  A feed of 1,000 records, newest first, read 20 a page to the end.
  Between pages the shop changes. Counted over the records there from start to end:

  between pages                   OFFSET            cursor
                          twice   missed    twice   missed
  nothing changes             0        0        0        0
  1 new record               52        0        0        0
  5 new records             330        0        0        0
  1 seen record sold          0       47        0        0
  3 seen records sold         0      129        0        0

  Offsets count rows, so every change above your place shifts the next page.
  A cursor remembers the last row itself, so changes elsewhere cannot move it.
```

One new record per page meant 52 repeats over the walk. One sale per page of a record already seen meant 47 records nobody saw, though they were in the shop the whole time.

## Remember the row, not the count

A **cursor** (also called **keyset** or **seek** pagination) remembers where the reader stopped by the sort key of the last row they saw. The next page is "the rows after that one":

```sql
-- page 1
SELECT * FROM records ORDER BY id DESC LIMIT 10;
-- every next page: the last id the client saw goes in
SELECT * FROM records WHERE id < :last_id ORDER BY id DESC LIMIT 10;
```

New rows arrive above the reader, with bigger ids, so `id < :last_id` never returns them on a later page. A sold row simply disappears, and the next page still starts right after the last row the reader saw. Nothing shifts, because nothing is counted.

There is a second win. With an index on `id`, the database jumps straight to `:last_id` and reads ten rows. An offset has no shortcut: to skip 50 rows it reads 50 rows and throws them away. That is the last line of the run: 273 rows read to serve 63. Chapter 05 measures how much that costs at depth.

## The API shape

Do not make clients build the `WHERE` clause. Hand them a token:

```text
GET /arrivals            -> { "items": [#60 ... #51], "next": "51" }
GET /arrivals?cursor=51  -> { "items": [#50 ... #41], "next": "41" }
...
GET /arrivals?cursor=11  -> { "items": [#10 ... #1],  "next": "1" }
GET /arrivals?cursor=1   -> { "items": [],            "next": null }
```

The client passes `next` back unchanged and stops when it is `null`. The last request returns nothing, because a full page cannot tell whether more rows follow it. Chapter 07 fixes that with one extra row. The case already has this shape. Only what is inside the token is wrong. Chapter 06 makes the token opaque, so you can change what is inside it without breaking a single client.

## What you give up

Cursors are not free, and "always use cursors" is not always right.

- **No jumping.** There is no page 7, only "after this row". Fine for feeds and infinite scroll, a loss for a table where people jump to the end.
- **No "page 3 of 12".** The cursor does not know how many rows came before it. Chapter 07 shows that counting is often too expensive anyway.
- **Going back** needs the opposite query: `WHERE id > :first_id ORDER BY id ASC`, then reverse the rows. Many APIs return a `prev` cursor for this.
- **The sort key must be indexed** and must give a total order (chapter 03). Sorting by relevance, or by a computed value, often cannot use a cursor at all.

When the list is small, rarely changes, and people want page numbers, offsets are still fine. When the list is busy or deep, use a cursor. Another option for rare cases is to pin a snapshot: save the result ids once and page through that saved list.

## Fix the case

Change what `arrivals` puts in `next`, and what it does with the cursor it gets back. The cursor should hold the id of the last record on the page, and the next page should ask the store for the newest records before that id. `Store.newest` already accepts `before_id`. Do not touch `collect`: the check walks the feed with its own client.

## Check it works

```bash
uv run python -m crate check 4
```

```text
  PASS  with 12 new arrivals while reading, each of the 60 is shown once
  PASS  with 3 sales while reading, none of the others is skipped
  PASS  newest first, across the whole walk
  PASS  a deep page reads no more rows than a first page (most for one page: 10)
```

## Exercise

The new arrivals that land while the collector reads are never shown to them. Is that right for a "new arrivals" feed? Describe how an app could tell the reader "3 new records since you started" without breaking the walk. (Hint: a second cursor, pointing the other way.)

### More to try

- Make `next` the id of the **first** record on the page instead of the last. What does the check say?
- In `lab/crate/experiments.py`, add a row to `drift` with 2 new records and 2 sales between pages. Predict the OFFSET numbers before you run it.
