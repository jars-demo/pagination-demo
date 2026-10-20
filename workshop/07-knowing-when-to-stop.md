# Knowing when to stop

> Only the server knows where the list ends. A short page, or an empty one, is not the end until the server says so.

**Time:** 15 minutes

## Goal

Write a client loop that reads every page and stops at the right moment, understand why servers return short and empty pages, tell a client there is more without counting everything, and know what a total count really costs.

## The case

```bash
uv run python -m crate run 7
```

```text
records for sale:   189
records downloaded: 18
requests made:      1
last reply:         18 records, next = '20'
```

A partner downloads the catalogue every night. Last night the job saved 18 records, logged success and went to sleep. The shop has 189 records for sale. The server's reply even said there was more. Open `lab/cases/case07_stop.py` and read the server's docstring first, then `download_all`.

## Why pages come back short

It feels natural that a page holds `limit` rows until the last one. Servers break that rule for good reasons:

- **Filtering after the fetch.** The server reads twenty rows, then drops the ones this caller may not see: hidden, on hold, in another region, deleted. That is what the case does. Records on hold make page 1 eighteen long, and a stock-take empties a whole page in the middle.
- **Time or size budgets.** Some servers stop a page early when it took too long or grew too big, and return what they have with a cursor to continue.
- **Partitioned data.** A server that reads from several shards may return whatever one shard had.
- **Clamping.** Chapter 02: you asked for 1,000, the server sends 100.

So the contract most APIs document is: **a page may hold fewer rows than the limit, even none. Keep going until `next` is empty.**

## The loop

The shape of a correct client is short:

```text
cursor = nothing
repeat:
    page = fetch(cursor)
    keep page.items
    if page.next is empty: stop
    cursor = page.next
```

It does not look at how many items came back. Two guards are worth adding in real code: stop with an error if the server ever returns the same cursor twice (a server bug that would loop forever), and put an upper bound on pages for jobs that run unattended.

## How the server knows there is more

The server has to decide whether to send `next`. Three ways, from worst to best:

- **"The page is full, so there might be more."** Cheap, but when the rows run out exactly at a page boundary, the client makes one extra request and gets an empty page. You saw this in chapter 04.
- **Count everything.** Exact, and expensive. See below.
- **Ask for one row more than the page.** Fetch `limit + 1` rows. If you got the extra row, there is a next page. Drop it and send the rest. One query, no count, no wasted request.

## What a total costs

"Page 1 of 12" and "189 results" need a count of every matching row. Measure it:

```bash
uv run python -m crate try count
```

```text
Python 3.13.16, SQLite 3.45.1, Linux, 4 CPUs

  To show 'page 1 of N' the server must count every match. The page itself needs 21.

  records     COUNT(*) jazz    first page   count is
  10,000           0.102 ms      0.029 ms         4x
  100,000          0.556 ms      0.018 ms        32x
  1,000,000        5.520 ms      0.017 ms       328x

  Both queries use the same index. The count grows with the table. The page does not.
```

The first page took about the same time at every size. The count grew with the table, until at a million rows it cost 328 times as much as the page it was printed above. Even with an index, the database has to visit every matching entry to count it.

Choices that work:

- **Do not show a total.** "Next" and "Previous" are enough for most lists.
- **Show an estimate.** Say "about" and use the row estimate from the table statistics, or cap the count: count no further than the limit you would ever show, plus one, and print "more than" when you reach it.
- **Count separately.** Load the page at once and fetch the count in a second, cacheable request that the page does not wait for.

## Fix the case

`download_all` stops as soon as a page is shorter than `LIMIT`. Stop on the one signal the server documents instead. Remember the empty page in the middle: whatever condition you choose, it must not stop there. The check uses its own pretend server, and counts the requests your loop makes, so an extra request after the end shows up too.

## Check it works

```bash
uv run python -m crate check 7
```

```text
  PASS  every record for sale is downloaded, once (189 of 189)
  PASS  it stops when next is None: 12 requests, no more (12)
  PASS  an empty page in the middle does not stop it
  PASS  a single short last page takes one request
```

## Exercise

Change the server, `catalogue`, to fetch `LIMIT + 1` rows and decide `next` from the extra row. Does the number of requests the client makes change for this shop? Work out a shop size where it would.

### More to try

- Add the "same cursor twice" guard to `download_all`, then break the server so it always returns `next = "20"`. Does your client stop with a clear error?
- Your own APIs: does any client you know stop on `len(items) < limit`? Search the code for it.
