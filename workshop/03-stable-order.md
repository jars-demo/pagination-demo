# A stable order

> Pagination only works if the order is total: every row has exactly one place, and it is the same place every time you ask.

**Time:** 20 minutes

## Goal

Understand why rows that tie on the sort column can come back in any order, see how that makes pages lose and repeat rows with nothing changing, and make an order total with a tie-breaker.

## The case

```bash
uv run python -m crate run 3
```

```text
pages walked:      5, 20 records a page
rows shown:        100
different records: 95
shown twice:       5
never shown:       5  (#29, #38, #44, #48, #61)

page 2, asked twice: 2 of 20 records changed
```

The shop lists its 100 records cheapest first. Nobody added or removed a record, yet five records appear twice and five never appear. Asking for the same page twice gives different records. Open `lab/cases/case03_order.py` and read the docstring of `Database.select`, then `Shop.cheapest`.

## Ties have no order

The shop has eight prices and 100 records, so about a dozen records share each price: eleven of them cost 12.00. `ORDER BY price` says which price group comes first. It says nothing about the order inside a group.

The SQL standard leaves that order open, and real databases use the freedom. The PostgreSQL manual puts it plainly: "When using LIMIT, it is important to use an ORDER BY clause that constrains the result rows into a unique order. Otherwise you will get an unpredictable subset of the query's rows." The order of ties can depend on:

- the plan the database picked, which can change as the table grows or statistics update;
- whether it sorted in memory or on disk, and which sort algorithm it used;
- parallel workers finishing in a different order;
- which pages were already in its cache.

The fake database in the case makes that visible. It shuffles each group of ties with a seed taken from the query, so you see the same surprise every run. A real database would show it rarely, on your production data and not in your tests, which is worse.

## Why this breaks pages

Each page is a separate query. Page 1 sorts the ties one way and takes the first twenty rows. Page 2 runs again, sorts the ties another way, skips twenty and takes the next twenty. The eleven records at 12.00 straddle the cut between the two pages. Here are rows 18 to 20 of each query, from the run above, and where page 2 begins:

```text
query for page 1:   ... #69 #79 #35 | (page 1 ends here)
query for page 2:   ... #79 #61 #35 | #74 #69 #47 ...
                                    ^ the cut after 20 rows
```

Page 1 showed #69. The second query put #69 after the cut, so page 2 shows it again. It put #61 before the cut, where page 2 skips it, and page 1 never reached it. #61 is one of the five records that never appear. Nothing was added or removed: the order itself moved.

## Make the order total

An order is **total** when no two rows tie on the whole sort key. The fix is always the same: add a column that is unique as the last item in the `ORDER BY`. The primary key is the usual choice.

```sql
ORDER BY price, id
```

Now every record has exactly one place. Two records at 12.00 are ordered by their ids, and the same query returns the same rows in the same order every time.

The tie-breaker has to be **unique**. A column that is merely "nearly unique", such as a title or a timestamp, only makes the bug rarer, which makes it harder to find. Records share titles, and a busy table writes many rows in the same millisecond. The checker tries this: it gives 100 records the same price, title and artist, and only a unique column can tell them apart.

## When it matters, and when it does not

Every paginated query needs a total order, with no exceptions. Even a single page needs one if anyone will ever ask for that page twice and expect the same answer, which includes your tests.

Adding `id` costs almost nothing when there is an index on `(price, id)`: the database reads the index in order and never sorts. Without that index it has to sort, and a deep page sorts a lot. Chapter 05 builds on this exact index.

## Fix the case

`Shop.cheapest` passes `order_by` to the database. Make the order total by adding a unique column after `price`. Do not fetch every row and sort in Python: the check makes sure each page is still one query for twenty rows.

## Check it works

```bash
uv run python -m crate check 3
```

```text
  PASS  five pages show all 100 records exactly once (100 different)
  PASS  cheapest first, on every page and across pages
  PASS  page 2 asked twice gives the same records in the same order
  PASS  100 copies of one record at one price still show once each
  PASS  each page is one query for 20 rows (5 queries, 100 rows)
```

## Exercise

Try `order_by=("price", "title")` and run the check. The first check may pass, and the fourth fails. Explain why "it passed on my data" is not proof of a total order, and name a column in a table you work with that looks unique but is not.

### More to try

- Sort dearest first. Should the tie-breaker go dearest first too, or can it stay in id order? (Both give a total order. Chapter 05 shows why matching directions makes cursors easier.)
- What happens to the order of rows whose price is `NULL`? Look up `NULLS FIRST` and `NULLS LAST` for the database you use.
