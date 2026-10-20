# Syncing changes

> "Give me everything that changed since last time" is pagination over time. A timestamp is the wrong cursor for it.

**Time:** 25 minutes

## Goal

Page through changes for an incremental sync, see the two ways a timestamp cursor loses updates, switch to a value that only goes up and that no two writes share, and learn the one gap that even that leaves in a real database.

## The case

```bash
uv run python -m crate run 8
```

```text
records in the shop:   25
records in the mirror: 11

#3   shop 36.00   mirror   30.00   WRONG
#20  shop  6.00   mirror    6.00   same

the mirror's bookmark: 1090
```

A warehouse keeps a copy of the catalogue. Every minute it asks for rows changed since its bookmark, ten at a time, and moves the bookmark forward. By the end of the day it has 11 of the 25 records, and the price of #3 is wrong. Nothing will ever correct it, because the bookmark has moved past it. Open `lab/cases/case08_sync.py`. Read `Mirror.sync`, then `day`, which is the timeline.

## Two ways a timestamp loses rows

The mirror pages with `updated_at > bookmark`, ordered by `updated_at`. That is a cursor on a column that is not unique, so chapter 05's trap door is back:

- **Ties at the page boundary.** The morning delivery writes 25 records in the same second. Page 1 returns ten of them, and the bookmark becomes that second. Page 2 asks for rows after that second and gets none. Fifteen records are gone. Adding the id as a tie-breaker fixes this one.
- **Writes that land behind the bookmark.** The sync reads at 1000.4 seconds. At 1000.7 the price of #3 changes. Its `updated_at` is 1000, the same whole second, which the bookmark has already passed. No later sync will ask for it. A tie-breaker does not help here: the change happened after the read, but its timestamp says before.

Real systems make the second problem worse. Timestamps come from different servers with clocks that disagree by milliseconds or more. A transaction stamps its rows when it starts but becomes visible when it commits, so a slow transaction can show up seconds after rows with later timestamps were already read. Many columns store whole seconds, or milliseconds, and a busy table writes many rows in each.

## A value that only goes up

What the sync needs is a column where:

1. **every write gets a new value**, so there are no ties, and
2. **later writes always get bigger values**, so nothing lands behind the bookmark.

That is a **version** or **change number**: a counter the database increases on every write. The store in the case already keeps one. Page with `version > bookmark ORDER BY version`, set the bookmark to the last version you saw, and both problems go away. #3's price change gets version 26, after everything the mirror has read.

Databases offer this in several forms: a sequence column set by a trigger, SQL Server's `rowversion`, a change log or outbox table that every write appends to, or the database's own replication stream.

## The gap that remains

In a real database, even a counter can be read out of order. Two transactions take versions 41 and 42. Transaction 42 commits first. A sync reads 42 and moves the bookmark there. Then 41 commits, behind the bookmark.

The fixes, from simplest to strongest:

- **A safety lag.** Only read versions older than a few seconds, so slow transactions have time to commit. Simple, and it covers almost every case.
- **Read only up to what is committed.** Some databases can tell you the oldest transaction still running (PostgreSQL's `pg_snapshot_xmin`). Read no further than that.
- **Change data capture.** Read the database's own log of committed changes, in commit order. This is what replication does, and it is the strongest answer.

Whatever you choose, make the sync **idempotent**: copying the same row twice must be harmless. Then reading a little too much is always safe, and only reading too little is a bug.

## Deletes

A row that is deleted cannot show up in "changed since". Either mark rows as deleted and keep them for a while (a "tombstone" with its own version), or keep a separate log of deletions. A sync that only sees updates slowly fills up with records that no longer exist.

## Fix the case

Make the mirror page by the version instead of `updated_at`, and keep the version of the last row it copied as its bookmark. `changed_since` takes the column name. Keep the page size at ten, and do not reset the bookmark to read everything every time: the check makes sure a quiet sync reads nothing.

## Check it works

```bash
uv run python -m crate check 8
```

```text
  PASS  after the day the mirror holds all 25 records at today's prices (25)
  PASS  30 changes in one second are all copied (30)
  PASS  a sync with nothing new reads no rows
  PASS  it still reads 10 rows a page at most (largest 10)
```

## Exercise

Change the bookmark to `rows[-1].updated_at - 1`, so the sync re-reads the last second every time. It looks like a safety lag. Run the check and explain what happens to a burst of 30 changes in one second with ten rows a page.

### More to try

- Add a `delete` to the store and to `day`. How would the mirror ever find out? Add a tombstone and make the check for it pass.
- In `day`, make two writes take versions out of commit order, and show the mirror missing one. Then add a safety lag and show it catching up.

## The pagination checklist

You have fixed all eight. Take this into code review:

1. Count pages from 1 for people and from 0 for code, and convert in one place.
2. Give every list a default limit and a maximum, and refuse or clamp anything outside them.
3. End every ORDER BY with a unique column, so the order is total.
4. Use a cursor, not an offset, for any list that changes while people read it.
5. Make the cursor the whole sort key, and seek strictly after it.
6. Keep cursors opaque, and put the whole query inside them: filters, sort and direction.
7. Return a next cursor, and let only its absence mean the end.
8. Fetch one row more than the page to know if there is a next one. Count only when someone needs the number.
9. Sync changes by a version that only goes up and that no two writes share, never by a timestamp.
10. Test pagination by walking every page while the data changes, and check each row appears exactly once.
