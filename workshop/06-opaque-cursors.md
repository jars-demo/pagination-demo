# Opaque cursors

> A cursor is not a position. It is a position in one particular answer, and it has to remember the question.

**Time:** 20 minutes

## Goal

Design a cursor token that clients cannot misuse: opaque to them, carrying the whole query it belongs to, versioned, and refused with a clear error when it does not fit the request.

## The case

```bash
uv run python -m crate run 6
```

```text
asked for: genre=jazz, sort=-price (dearest first). 55 jazz records in all.

page 1:  10 of 10 are jazz   prices 48.00 to 30.00
page 2:   2 of 10 are jazz   prices 9.00 to 9.00
page 3:   3 of 10 are jazz   prices 9.00 to 9.00

pages: 25   records shown: 250   jazz among them: 65
```

A collector asks for jazz, dearest first. Page 1 is right. From page 2 on, the client sends only the cursor, as most API clients do, and the answer turns into the whole shop, cheapest first. Following `next` to the end returns 250 records, more than the shop holds. Open `lab/cases/case06_opaque.py`, then decode the cursor from page 1 yourself:

```text
eyJhZnRlciI6IFstMzAwMCwgLTE0OF19
{'after': [-3000, -148]}
```

It holds the position in the jazz list, and nothing else.

## What goes in a cursor

The server needs three things to produce the next page: **which rows** (the filters), **in which order** (the sort and its direction), and **where to start** (the last sort key). An offset or a bare id only holds the third. The first two came from the original request, and the case assumes the client will send them again. Many clients do not. Several big public APIs tell clients that when a cursor is given, the other parameters can or must be left out, because the cursor already holds them.

So put the question in the cursor:

```text
{"after": [-3000, -148], "genre": "jazz", "sort": "-price"}
```

Now page 2 needs nothing but the token. The server reads the filter and the sort out of it, and the walk cannot change direction halfway.

## What if the request disagrees?

A client might send a cursor together with parameters: the same ones (harmless) or different ones (a bug). A jazz cursor sent with `genre=rock` points into the jazz list. Using it to read rock gives an answer that is neither: rock records priced below some jazz record. Refuse it with a `400` and say why. Silently picking one of the two is how the case went wrong.

## Opaque means opaque

The cursor here is base64-encoded JSON. That is **encoding, not encryption**: anyone can decode it, as you just did. Making it opaque is a promise in the documentation ("treat this as a string, do not build or change it") that lets you change its contents later. To make that promise hold:

- **Version it.** Put a version number inside, such as `"v": 2`, so the server can still read last month's cursors, or refuse them clearly, after the format changes.
- **Sign it if tampering matters.** A client that edits `after` can only move its own position in a list it may read anyway. But if the cursor holds anything the server trusts, such as a tenant id or a permission scope, add an HMAC signature and refuse cursors that fail it.
- **Never put secrets in it.** Tokens end up in logs, browser history and bug reports.
- **Keep it small.** It travels in URLs. Store the key, the filters and the sort, not the rows.
- **Decide whether it expires.** A cursor that points at a row key keeps working for as long as the sort exists. A cursor that points at a saved snapshot dies with it. Document which one yours is.

A token that is not ours, or no longer valid, gets a `400` with a message, never a `500`. The case already does that, and the check keeps it.

## When to keep it simple

An internal service with one client, written by the same team, can live with a plain `?after=148`. The day a second team or a public client appears, an opaque token saves you from supporting every shape of cursor anyone ever built by hand.

## Fix the case

Change `search` in two places. When it builds `next`, put the genre and the sort into the cursor along with `after`. When a cursor arrives, take the genre and the sort from it, and refuse the request with a `400` if the client also sent a genre or sort that disagrees. Changing `browse` to resend everything does not count: the check calls `search` itself, sending only the cursor.

## Check it works

```bash
uv run python -m crate check 6
```

```text
  PASS  sending only the cursor walks every jazz record once, dearest first
  PASS  the same for soul, cheapest first
  PASS  sending the same genre and sort with the cursor still works
  PASS  a jazz cursor sent with genre=rock is refused with 400
  PASS  a cursor that is not ours is refused with 400, not a crash
```

## Exercise

Add a `"v": 1` field to your cursor and make `search` refuse any other version with a clear message. Then write the two sentences of API documentation that tell a client what a cursor is and what it must not do with it.

### More to try

- Sign the cursor with `hmac.new(SECRET, payload, "sha256")` and refuse any cursor whose signature does not match. Edit one character of a token and confirm you get a 400.
- What should happen if the client sends a cursor with a different `limit` than page 1? Is that a mismatch, or fine?
