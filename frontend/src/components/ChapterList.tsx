import Link from 'next/link'

import { CASES } from '@/lib/site'
import { CHAPTERS } from '@/lib/workshop'

// The chapters as an index: one row per chapter, with its number in a black folio, the case it
// hands you and the time it takes.

export function ChapterList({ compact = false }: { compact?: boolean }) {
  return (
    <ol className="ruled flex flex-col">
      {CHAPTERS.map((chapter) => {
        const item = CASES.find((c) => c.number === chapter.number)
        return (
          <li key={chapter.slug} className="border-b border-rule">
            <Link
              href={`/workshop/${chapter.slug}`}
              className="group grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 gap-y-1 px-1 py-4 hover:bg-surface sm:grid-cols-[3.75rem_minmax(0,1fr)_minmax(0,15rem)_4.5rem] sm:items-center sm:px-2"
            >
              <span className="folio text-[15px] group-hover:bg-signal group-hover:text-ink">
                {chapter.number}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="display text-[19px] leading-snug text-ink sm:text-[21px]">
                  {chapter.title}
                </span>
                <span className="text-[14.5px] text-ink-2">Case: {item?.title}</span>
              </span>
              {compact ? null : (
                <span className="col-start-2 text-[13.5px] text-muted sm:col-start-auto">
                  {item?.topics}
                </span>
              )}
              <span
                className={`col-start-2 font-mono text-[13px] text-muted sm:text-right ${
                  compact ? 'sm:col-start-4' : 'sm:col-start-auto'
                }`}
              >
                {chapter.minutes} min
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
