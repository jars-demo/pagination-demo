import { describe, expect, it } from 'vitest'

import { arrive, begin, BUSY, nextPage, PAGE_SIZE, play, sell, statusOf, tally } from '@/lib/feed'

describe('the moving feed', () => {
  it('starts with twelve records, newest first, nothing read', () => {
    const feed = begin('offset')
    expect(feed.rows).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    expect(tally(feed)).toEqual({ shown: 0, twice: [], missed: [] })
    expect(statusOf(feed, 12)).toBe('unread')
  })

  it.each(['offset', 'cursor'] as const)('reads a quiet feed once with %s paging', (mode) => {
    const feed = play(mode, ['page', 'page', 'page'])
    expect(feed.pages).toEqual([
      [12, 11, 10, 9],
      [8, 7, 6, 5],
      [4, 3, 2, 1],
    ])
    expect(feed.done).toBe(true)
    expect(tally(feed)).toEqual({ shown: 12, twice: [], missed: [] })
  })

  it('repeats rows by offset when records arrive above you', () => {
    const feed = play('offset', ['page', 'arrive', 'arrive', 'page'])
    expect(feed.pages[1]).toEqual([10, 9, 8, 7])
    expect(tally(feed).twice).toEqual([10, 9])
    expect(statusOf(feed, 10)).toBe('twice')
    expect(statusOf(feed, 14)).toBe('new')
  })

  it('skips rows by offset when a seen record sells', () => {
    const feed = play('offset', ['page', 'sell', 'page'])
    expect(feed.pages[1]).toEqual([7, 6, 5, 4])
    expect(tally(feed).missed).toEqual([8])
    expect(statusOf(feed, 8)).toBe('missed')
  })

  it('plays the busy pattern: two repeats and two misses by offset, none by cursor', () => {
    const offset = play('offset', BUSY)
    expect(tally(offset)).toEqual({ shown: 12, twice: [10, 9], missed: [6, 5] })
    const cursor = play('cursor', BUSY)
    expect(tally(cursor)).toEqual({ shown: 12, twice: [], missed: [] })
    expect(cursor.pages).toEqual([
      [12, 11, 10, 9],
      [8, 7, 6, 5],
      [4, 3, 2, 1],
    ])
    expect(cursor.done).toBe(true)
  })

  it('sells only records you have seen, newest first', () => {
    const fresh = sell(begin('cursor'))
    expect(fresh.rows.length).toBe(12)
    expect(fresh.said).toContain('Read a page first')
    const after = sell(arrive(nextPage(begin('cursor'))))
    expect(after.rows).not.toContain(12)
    expect(after.rows).toContain(13)
  })

  it('stops at the end and ignores further actions', () => {
    const done = play('cursor', ['page', 'page', 'page'])
    expect(nextPage(done)).toBe(done)
    expect(arrive(done)).toBe(done)
    expect(done.pages.every((page) => page.length <= PAGE_SIZE)).toBe(true)
  })
})
