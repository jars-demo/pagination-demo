// The moving feed on the home page: a newest-first list of records that you read four at a time,
// while records arrive and sell. The same reader, paging by offset or by cursor. Pure functions,
// so the rules are unit tested without a browser.

export type Mode = 'offset' | 'cursor'

export const MODES: Record<Mode, { name: string; rule: string }> = {
  offset: { name: 'Offset', rule: 'skips as many rows as you have read' },
  cursor: { name: 'Cursor', rule: 'starts after the last record you saw' },
}

export const PAGE_SIZE = 4
export const START = 12

export type Action = 'page' | 'arrive' | 'sell'

export type Feed = {
  mode: Mode
  /** Record ids in the shop now, newest first. */
  rows: number[]
  /** The ids that were there when the reader began. */
  start: number[]
  nextId: number
  /** Offset mode: rows read so far. */
  offset: number
  /** Cursor mode: the last id read. */
  after: number | null
  pages: number[][]
  done: boolean
  /** What just happened, in words. */
  said: string
}

export function begin(mode: Mode, count: number = START): Feed {
  const rows = Array.from({ length: count }, (_, index) => count - index)
  return {
    mode,
    rows,
    start: [...rows],
    nextId: count + 1,
    offset: 0,
    after: null,
    pages: [],
    done: false,
    said: `${count} records, newest first. Read them ${PAGE_SIZE} at a time.`,
  }
}

function label(ids: readonly number[]): string {
  return ids.map((id) => `#${id}`).join(', ')
}

export function nextPage(feed: Feed): Feed {
  if (feed.done) return feed
  const page =
    feed.mode === 'offset'
      ? feed.rows.slice(feed.offset, feed.offset + PAGE_SIZE)
      : feed.rows.filter((id) => feed.after === null || id < feed.after).slice(0, PAGE_SIZE)
  const offset = feed.offset + PAGE_SIZE
  const after = page.at(-1) ?? feed.after
  // Ask the way a server with limit + 1 would: is there anything after this page?
  const done =
    feed.mode === 'offset' ? offset >= feed.rows.length : !feed.rows.some((id) => id < (after ?? 0))
  const number = feed.pages.length + 1
  return {
    ...feed,
    offset,
    after,
    pages: [...feed.pages, page],
    done,
    said: page.length
      ? `Page ${number}: ${label(page)}.${done ? ' That is the end of the feed.' : ''}`
      : `Page ${number} is empty. That is the end of the feed.`,
  }
}

export function arrive(feed: Feed): Feed {
  if (feed.done) return feed
  return {
    ...feed,
    rows: [feed.nextId, ...feed.rows],
    nextId: feed.nextId + 1,
    said: `#${feed.nextId} arrives at the top of the feed.`,
  }
}

/** The newest record that the reader has already seen is sold, and leaves the feed. */
export function sell(feed: Feed): Feed {
  if (feed.done) return feed
  const seen = new Set(feed.pages.flat())
  const gone = feed.rows.find((id) => seen.has(id))
  if (gone === undefined) return { ...feed, said: 'Read a page first: only a seen record sells.' }
  return {
    ...feed,
    rows: feed.rows.filter((id) => id !== gone),
    said: `#${gone}, which you have seen, sells and leaves the feed.`,
  }
}

const STEPS: Record<Action, (feed: Feed) => Feed> = { page: nextPage, arrive, sell }

export function step(feed: Feed, action: Action): Feed {
  return STEPS[action](feed)
}

/** A busy few minutes: read, two arrivals, read, two sales, read to the end. */
export const BUSY: readonly Action[] = ['page', 'arrive', 'arrive', 'page', 'sell', 'sell', 'page']

export function play(mode: Mode, actions: readonly Action[] = BUSY): Feed {
  return actions.reduce(step, begin(mode))
}

export type Status = 'unread' | 'once' | 'twice' | 'missed' | 'new'

export function tally(feed: Feed) {
  const seen = feed.pages.flat()
  const counts = new Map<number, number>()
  for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1)
  const last = [...feed.pages]
    .reverse()
    .find((page) => page.length)
    ?.at(-1)
  const passed = (id: number) => feed.done || (last !== undefined && id > last)
  const original = new Set(feed.start)
  const twice = [...counts].filter(([, n]) => n > 1).map(([id]) => id)
  const missed = feed.rows.filter((id) => original.has(id) && !counts.has(id) && passed(id))
  return { shown: seen.length, twice, missed }
}

export function statusOf(feed: Feed, id: number): Status {
  const { twice, missed } = tally(feed)
  if (twice.includes(id)) return 'twice'
  if (missed.includes(id)) return 'missed'
  if (feed.pages.some((page) => page.includes(id))) return 'once'
  return feed.start.includes(id) ? 'unread' : 'new'
}
