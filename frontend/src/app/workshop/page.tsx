import type { Metadata } from 'next'

import { ChapterList } from '@/components/ChapterList'
import { CHAPTERS } from '@/lib/workshop'

export const metadata: Metadata = { title: 'Chapters' }

export default function Workshop() {
  const minutes = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0)
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pt-14 pb-24">
      <header className="flex flex-col gap-4">
        <span className="eyebrow">
          The index · {CHAPTERS.length} chapters · {minutes} minutes
        </span>
        <h1 className="display text-[44px] leading-[1.02] text-ink sm:text-[58px]">The chapters</h1>
        <p className="max-w-2xl font-serif text-[19px] leading-relaxed text-ink-2">
          Work through them in order. Each one explains an idea, hands you a program that gets it
          wrong, and ends with a check that walks every page: every row exactly once, in order, and
          no more work than the page needs.
        </p>
      </header>
      <ChapterList />
    </div>
  )
}
