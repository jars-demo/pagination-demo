import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CopyButton } from '@/components/CopyButton'
import { headingsOf, Markdown } from '@/components/Markdown'
import { CASES } from '@/lib/site'
import { type Chapter, CHAPTERS, findChapter } from '@/lib/workshop'

export function generateStaticParams() {
  return CHAPTERS.map((chapter) => ({ slug: chapter.slug }))
}

export async function generateMetadata(props: PageProps<'/workshop/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const chapter = findChapter(slug)
  return { title: chapter ? `${chapter.number}. ${chapter.title}` : 'Chapter' }
}

function Outline({ chapter }: { chapter: Chapter }) {
  return (
    <ul className="flex flex-col text-[14px]">
      {headingsOf(chapter.body).map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className="flex min-h-10 items-center text-ink-2 hover:text-ink hover:underline lg:min-h-8"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Chapters({ current }: { current: Chapter }) {
  return (
    <ol className="flex flex-col gap-0.5 text-[14px]">
      {CHAPTERS.map((chapter) => {
        const here = chapter.slug === current.slug
        return (
          <li key={chapter.slug}>
            <Link
              href={`/workshop/${chapter.slug}`}
              aria-current={here ? 'page' : undefined}
              className={`flex min-h-8 items-center gap-2.5 px-1 ${
                here ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <span className={`folio text-[11px] ${here ? 'is-here' : ''}`}>{chapter.number}</span>
              {chapter.title}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export default async function ChapterPage(props: PageProps<'/workshop/[slug]'>) {
  const { slug } = await props.params
  const chapter = findChapter(slug)
  if (!chapter) notFound()
  const index = CHAPTERS.indexOf(chapter)
  const previous = CHAPTERS[index - 1]
  const next = CHAPTERS[index + 1]
  const item = CASES.find((c) => c.number === chapter.number)
  const n = Number(chapter.number)
  const commands = `uv run python -m crate run ${n}\nuv run python -m crate check ${n}\nuv run python -m crate hint ${n}`

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[14px] text-muted">
        <Link
          href="/workshop"
          className="inline-flex min-h-10 items-center hover:text-ink hover:underline"
        >
          Chapters
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-2">{chapter.number}</span>
      </nav>

      <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-4">
          <span className="flex items-center gap-3">
            <span className="folio is-here text-[15px]">{chapter.number}</span>
            <span className="eyebrow">
              Chapter {chapter.number} of {CHAPTERS.length} · {chapter.minutes} minutes
            </span>
          </span>
          <h1 className="display text-[40px] leading-[1.02] text-balance text-ink sm:text-[56px]">
            {chapter.title}
          </h1>
          <p className="max-w-2xl font-serif text-[20px] leading-relaxed text-ink-2 italic">
            {chapter.summary}
          </p>
        </div>
        {item ? (
          <aside
            aria-label={`Case ${chapter.number}`}
            className="panel min-w-0 self-end border-2 border-ink"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-2.5">
              <span className="text-[12px] font-bold tracking-[0.12em] text-ink uppercase">
                Case {chapter.number}
              </span>
              <span className="text-[12px] text-muted">what you will see</span>
            </div>
            <p className="display px-4 pt-3 text-[18px] leading-snug text-ink">{item.title}</p>
            <pre className="m-4 mt-3 flex gap-2 bg-missed-wash px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-missed [overflow-wrap:anywhere]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
                className="mt-1 shrink-0"
              >
                <path
                  d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>
                <span className="sr-only">The bug: </span>
                {item.symptom}
              </span>
            </pre>
          </aside>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-14">
        <article className="min-w-0">
          <details className="panel lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-[14.5px] font-semibold">
              On this page
            </summary>
            <div className="border-t border-rule px-4 py-2">
              <Outline chapter={chapter} />
            </div>
          </details>

          <div className="prose-index max-w-[42rem]">
            <Markdown>{chapter.body}</Markdown>
          </div>

          <section
            aria-labelledby="commands"
            className="code mt-14 max-w-[42rem] overflow-hidden border-l-4 border-signal"
          >
            <div className="flex items-center justify-between gap-3 border-b border-code-rule py-1 pr-1 pl-4">
              <h2
                id="commands"
                className="font-sans text-[11.5px] font-bold tracking-[0.12em] text-code-muted uppercase"
              >
                Chapter {chapter.number} · commands, from lab/
              </h2>
              <CopyButton text={commands} />
            </div>
            <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-relaxed">{commands}</pre>
          </section>

          <nav
            aria-label="Previous and next"
            className="mt-8 grid max-w-[42rem] gap-3 sm:grid-cols-2"
          >
            {previous ? (
              <Link
                href={`/workshop/${previous.slug}`}
                className="panel flex flex-col gap-1 border-2 border-ink p-4 hover:bg-surface-2"
              >
                <span className="eyebrow">Previous</span>
                <span className="display text-[17px] text-ink">
                  {previous.number}. {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/workshop/${next.slug}`}
                className="panel flex flex-col gap-1 border-2 border-ink p-4 text-right hover:bg-surface-2"
              >
                <span className="eyebrow">Next</span>
                <span className="display text-[17px] text-ink">
                  {next.number}. {next.title}
                </span>
              </Link>
            ) : (
              <Link
                href="/#checklist"
                className="flex flex-col gap-1 border-2 border-ink bg-signal p-4 text-right hover:bg-signal-hover"
              >
                <span className="eyebrow">All eight fixed</span>
                <span className="display text-[17px] text-ink">The pagination checklist</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-8">
            <nav aria-label="On this page" className="flex flex-col gap-2">
              <span className="eyebrow">On this page</span>
              <Outline chapter={chapter} />
            </nav>
            <nav aria-label="Chapters" className="flex flex-col gap-2">
              <span className="eyebrow">Chapters</span>
              <Chapters current={chapter} />
            </nav>
          </div>
        </aside>
      </div>
    </div>
  )
}
