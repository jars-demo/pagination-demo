'use client'

import { useState } from 'react'

import {
  arrive,
  begin,
  BUSY,
  type Feed as FeedState,
  type Mode,
  MODES,
  nextPage,
  PAGE_SIZE,
  play,
  sell,
  type Status,
  statusOf,
  tally,
} from '@/lib/feed'

// The moving feed: read a newest-first list four at a time while records arrive and sell.
// Every row shows its status with an icon and a word, never by colour alone.

const LOOK: Record<Status, { word: string; chip: string; row: string }> = {
  unread: { word: 'not read yet', chip: 'border-rule-strong text-muted', row: 'bg-surface' },
  once: { word: 'seen once', chip: 'border-once text-once bg-once-wash', row: 'bg-surface' },
  twice: {
    word: 'seen twice',
    chip: 'border-twice text-twice bg-twice-wash',
    row: 'bg-twice-wash',
  },
  missed: {
    word: 'missed',
    chip: 'border-missed text-missed bg-missed-wash',
    row: 'bg-missed-wash',
  },
  new: { word: 'arrived while reading', chip: 'border-ink text-ink bg-signal', row: 'bg-surface' },
}

function Icon({ status }: { status: Status }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      {status === 'once' ? <path d="M2 6.5l2.5 2.5 5.5-6" {...common} /> : null}
      {status === 'twice' ? (
        <>
          <rect x="1" y="3.5" width="6" height="6" {...common} strokeWidth={1.6} />
          <rect x="5" y="1.5" width="6" height="6" {...common} strokeWidth={1.6} />
        </>
      ) : null}
      {status === 'missed' ? <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" {...common} /> : null}
      {status === 'new' ? <path d="M6 1.5v9M1.5 6h9" {...common} /> : null}
      {status === 'unread' ? (
        <rect x="2" y="2" width="8" height="8" {...common} strokeWidth={1.4} />
      ) : null}
    </svg>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1 border-t-2 border-ink pt-2">
      <dt className="text-[12px] font-bold tracking-[0.1em] text-ink-2 uppercase">{label}</dt>
      <dd data-testid={label} className={`display text-[30px] leading-none ${tone}`}>
        {value}
      </dd>
    </div>
  )
}

export function Feed() {
  const [feed, setFeed] = useState<FeedState>(() => begin('offset'))
  const { shown, twice, missed } = tally(feed)
  const latest = feed.pages.at(-1) ?? []

  const button =
    'inline-flex min-h-11 items-center justify-center border-2 border-ink px-3.5 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:border-rule-strong disabled:text-muted'

  return (
    <div className="panel flex min-w-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-rule p-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="How the reader pages" className="flex">
          {(Object.keys(MODES) as Mode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={feed.mode === mode}
              onClick={() => setFeed(begin(mode))}
              className={`${button} -ml-[2px] first:ml-0 ${
                feed.mode === mode ? 'bg-ink text-canvas' : 'bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              {MODES[mode].name}
            </button>
          ))}
        </div>
        <p className="text-[14px] text-ink-2">
          <strong className="text-ink">{MODES[feed.mode].name}</strong> {MODES[feed.mode].rule}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-rule p-4">
        <button
          type="button"
          disabled={feed.done}
          onClick={() => setFeed(nextPage(feed))}
          className={`${button} bg-signal text-ink hover:bg-signal-hover`}
        >
          Next page
        </button>
        <button
          type="button"
          disabled={feed.done}
          onClick={() => setFeed(arrive(feed))}
          className={`${button} bg-surface text-ink hover:bg-surface-2`}
        >
          A record arrives
        </button>
        <button
          type="button"
          disabled={feed.done}
          onClick={() => setFeed(sell(feed))}
          className={`${button} bg-surface text-ink hover:bg-surface-2`}
        >
          A seen record sells
        </button>
        <button
          type="button"
          onClick={() => setFeed(play(feed.mode, BUSY))}
          className={`${button} bg-surface text-ink hover:bg-surface-2`}
        >
          Play the busy pattern
        </button>
        <button
          type="button"
          onClick={() => setFeed(begin(feed.mode))}
          className={`${button} border-transparent bg-transparent text-ink-2 underline underline-offset-4 hover:text-ink`}
        >
          Start over
        </button>
      </div>

      <p
        role="status"
        className="flex min-h-12 items-center gap-2 border-b border-rule bg-surface-2 px-4 py-2 text-[14.5px] text-ink"
      >
        <span className="folio is-here text-[12px]">{feed.pages.length}</span>
        {feed.said}
      </p>

      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        <ol aria-label="The feed, newest first" className="flex flex-col">
          {feed.rows.map((id) => {
            const status = statusOf(feed, id)
            const here = latest.includes(id)
            return (
              <li
                key={id}
                className={`row-in flex min-h-10 items-center justify-between gap-3 border-b border-rule px-2 ${LOOK[status].row} ${
                  here ? 'shadow-[inset_4px_0_0_0_var(--signal)]' : ''
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="folio text-[12px]">#{id}</span>
                  {here ? (
                    <span className="text-[12px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                      this page
                    </span>
                  ) : null}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[12.5px] font-semibold ${LOOK[status].chip}`}
                >
                  <Icon status={status} />
                  {LOOK[status].word}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="Pages read" value={feed.pages.length} tone="text-ink" />
            <Stat label="Rows shown" value={shown} tone="text-ink" />
            <Stat label="Shown twice" value={twice.length} tone="text-twice" />
            <Stat label="Missed" value={missed.length} tone="text-missed" />
          </dl>
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Pages you got</p>
            {feed.pages.length ? (
              <ol className="flex flex-col gap-1 font-mono text-[13px] text-ink-2">
                {feed.pages.map((page, index) => (
                  <li key={index}>
                    {index + 1}: {page.length ? page.map((id) => `#${id}`).join(' ') : '(empty)'}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] text-muted">None yet. Press Next page.</p>
            )}
          </div>
          <p className="text-[13.5px] leading-relaxed text-muted">
            {PAGE_SIZE} records a page. Missed counts records that were there from the start, are
            still there, and that you have already gone past.
          </p>
        </div>
      </div>
    </div>
  )
}
