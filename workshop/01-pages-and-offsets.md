# Pages and offsets

> A page is two numbers: where to start and how many to take. Most pagination bugs start with the first one.

**Time:** 15 minutes

## Goal

Understand why lists are split into pages at all, turn a page number into a start position without an off-by-one, work out how many pages there are, and decide what to do at the edges: page 0, the last page and the page after it.

## The case

```bash
uv run python -m crate run 1
```

```text
page 1:  #21 to #40
page 2:  #41 to #60
page 3:  #61 to #80
page 4:  #81 to #100
page 5:  (empty)

records in the shop: 100
records shown:       80
never shown:         #1 to #20
```

The shop has 100 records and shows them twenty to a page. A visitor clicks page 1, page 2 and so on up to page 5. Twenty records never appear, and the last page is empty. Open `lab/cases/case01_offset.py` and read `page`.

## Why pages at all

A list with no end is a problem for everyone who touches it.

- **The server** has to read every row, turn it into JSON and hold it in memory before sending the first byte.
- **The network** has to carry all of it, even if the person only wanted the top ten.
- **The browser or app** has to parse it and draw it. A phone that gets 50,000 rows freezes.
- **The person** cannot read 50,000 rows anyway.

Pagination splits the list into pieces that are cheap to make, cheap to send and easy to read. The rest of this workshop is about doing that without losing rows, repeating rows or doing more work than the page needs.

## Two numbers: a start and a size

Every kind of pagination answers two questions: **where does this page start**, and **how many rows does it hold**. The simplest answer to the first is an **offset**: skip this many rows, then take the next `size`.

In SQL that is:

```sql
SELECT * FROM records ORDER BY id LIMIT 20 OFFSET 40;
```

In Python it is a slice: `records[40:60]`.

People count pages from 1. Lists and offsets count from 0. Page 1 must start at index 0, page 2 at index 20, page 3 at index 40. Write out three rows of that by hand before you write the formula, and the off-by-one has nowhere to hide:

| Page | First index | Last index | Records    |
| ---- | ----------- | ---------- | ---------- |
| 1    | 0           | 19         | #1 to #20  |
| 2    | 20          | 39         | #21 to #40 |
| 3    | 40          | 59         | #41 to #60 |

Convert between the two ways of counting in exactly one place. If the page number is turned into an offset in the URL handler and again in the database layer, sooner or later one of them is wrong.

## How many pages?

With `n` rows and `size` rows a page, there are `ceil(n / size)` pages. In integer arithmetic that is `(n + size - 1) // size`. 100 rows make 5 pages. 101 rows make 6, and the sixth holds a single row. 0 rows make 0 pages, but the page should still show something: "no records yet", not an error.

The edges deserve a decision each:

- **Page 0, or a negative page.** It is a mistake by the caller. Refuse it with a clear error (a `400` in an API). The case already does this, and the check keeps it that way.
- **A page past the end.** Return an empty list, not an error. Rows get deleted, so a page that existed a minute ago can be empty now. Clients must cope with that anyway.
- **The last page.** It is usually short. That is normal, and chapter 07 shows why "short" must never be taken to mean "last" in an API.

## When page numbers are the right choice

The usual advice online is "never use offsets". It is too strong. Page numbers are easy to build, easy to link to ("see page 7") and let people jump to any page. For an admin table of a few thousand rows that rarely change, they are the right tool.

They have two real weaknesses, which chapters 04 and 05 measure: when rows are added or removed while someone reads, the pages shift under them; and a deep offset is slow, because the database still reads every row it skips. Keep both in mind, but do not reach for anything fancier until one of them actually matters.

## Fix the case

Look at how `page` turns `number` into `start`. Page 1 starts at index 20. Work out where it should start, then write the rule that gives 0 for page 1, 20 for page 2 and 40 for page 3. Change only that line. Do not change `click_through` to start from page 0: page numbers are for people, and the check makes sure page 0 is still refused.

## Check it works

```bash
uv run python -m crate check 1
```

```text
  PASS  page 1 shows the first twenty records, #1 to #20
  PASS  every page, in order, shows all 100 records once (100 shown)
  PASS  no page is empty
  PASS  with 101 records there are 6 pages, and page 6 holds just #101
  PASS  page 0 is still refused
```

## Exercise

Add a `page(records, 6)` call to `run` and print what comes back. Is an empty list the right answer for a page past the end, or should it be an error? Write down one reason for each side, then pick one for an API and one for a web page.

### More to try

- Change `PAGE_SIZE` to 30. How many pages are there now, and how many records does the last one hold? Check your answer with `run`.
- Some APIs take `page` and `per_page`, others `offset` and `limit`. Which one lets a client ask for rows 45 to 64? Why might you not want to allow that?
