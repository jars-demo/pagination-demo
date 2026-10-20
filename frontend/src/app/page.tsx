import Link from 'next/link'

import { Bram } from '@/components/Bram'
import { ChapterList } from '@/components/ChapterList'
import { CopyButton } from '@/components/CopyButton'
import { DepthChart } from '@/components/DepthChart'
import { Feed } from '@/components/Feed'
import { CASE_FOUR, CASE_SEVEN, CHECKLIST, LEARN, MEASURED, QUICKSTART, REPO_URL } from '@/lib/site'
import { CHAPTERS } from '@/lib/workshop'

function SectionHead({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id} className="display text-[30px] leading-[1.08] text-ink sm:text-[40px]">
        {title}
      </h2>
      {children ? (
        <p className="font-serif text-[18px] leading-relaxed text-ink-2">{children}</p>
      ) : null}
    </div>
  )
}

export default function Home() {
  const minutes = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0)
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pt-20 lg:pb-20">
          <div className="flex min-w-0 flex-col gap-6">
            <span className="eyebrow">
              A hands-on workshop · {CHAPTERS.length} chapters · {minutes} minutes
            </span>
            <h1 className="display text-[44px] leading-[0.98] text-balance text-ink sm:text-[68px]">
              Every row,{' '}
              <span className="bg-signal px-1.5 box-decoration-clone">exactly once.</span>
            </h1>
            <p className="max-w-xl font-serif text-[20px] leading-relaxed text-ink-2 sm:text-[21px]">
              Pagination looks like two numbers in a URL. Then rows start to repeat, vanish and
              arrive mid-page. Learn to page through data that will not sit still, one real bug at a
              time, in one small record shop.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={`/workshop/${CHAPTERS[0]?.slug ?? ''}`}
                className="inline-flex h-12 items-center border-2 border-ink bg-signal px-6 text-[15.5px] font-bold text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-signal-hover"
              >
                Start chapter 01
              </Link>
              <a
                href={REPO_URL}
                className="inline-flex h-12 items-center border-2 border-ink bg-surface px-6 text-[15.5px] font-bold text-ink hover:bg-surface-2"
              >
                Read the source
              </a>
            </div>
          </div>
          <figure className="code min-w-0 border-2 border-ink">
            <figcaption className="flex items-center justify-between gap-3 border-b border-code-rule px-4 py-2.5 text-[12px] text-code-muted">
              <span>uv run python -m crate run 4</span>
              <span className="hidden font-sans font-bold tracking-[0.1em] uppercase sm:inline">
                real output
              </span>
            </figcaption>
            <pre className="px-4 py-4 text-[12.5px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] sm:text-[13px]">
              <span className="text-code-muted">{CASE_FOUR.setup.join('\n')}</span>
              {'\n\n'}
              {CASE_FOUR.read}
              {'\n'}
              <span className="text-code-twice">{CASE_FOUR.twice}</span>
              {'\n'}
              <span className="text-code-missed">{CASE_FOUR.missed}</span>
            </pre>
            <p className="border-t border-code-rule px-4 py-3 font-sans text-[14px] leading-snug text-code-ink">
              A newest-first feed, read by offset while the shop changes. Six records came round
              twice. Three were never shown. Chapter 04 fixes it with a cursor.
            </p>
          </figure>
        </div>
      </section>

      <section
        aria-labelledby="learn"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-20"
      >
        <SectionHead
          id="learn"
          eyebrow="What you will learn"
          title="From the first page to the last row"
        >
          Pagination has one promise: walk the pages to the end and you see every row exactly once,
          in order, without the server doing more work than the page needs. Each chapter keeps one
          part of that promise.
        </SectionHead>
        <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {LEARN.map((item, index) => (
            <li key={item.title} className="ruled flex min-w-0 flex-col gap-2 pt-3">
              <span className="font-mono text-[13px] text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="display text-[20px] leading-snug text-ink">{item.title}</span>
              <span className="text-[15.5px] leading-relaxed text-ink-2">{item.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="feed"
        aria-labelledby="feed-title"
        className="mx-auto grid max-w-6xl scroll-mt-6 gap-10 px-4 pt-24 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12 [&>*]:min-w-0"
      >
        <div className="flex flex-col gap-5">
          <SectionHead id="feed-title" eyebrow="Try it" title="The moving feed">
            Twelve records, newest first, four to a page. Records arrive at the top and sell while
            you read. Watch what each way of paging shows you.
          </SectionHead>
          <ol className="flex flex-col gap-3 text-[15.5px] leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">1.</strong> With Offset chosen, play the busy pattern.
              Two records come round twice, in blue, and two are missed, in red.
            </li>
            <li>
              <strong className="text-ink">2.</strong> Switch to Cursor and play it again. Every
              record is seen once.
            </li>
            <li>
              <strong className="text-ink">3.</strong> That one difference is case 04. Fix it in
              Python, in{' '}
              <Link
                href="/workshop/04-cursors"
                className="font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-3"
              >
                chapter 04
              </Link>
              .
            </li>
          </ol>
          <ul className="flex flex-col gap-1.5 border-t border-rule pt-4 text-[13.5px] text-ink-2">
            <li>
              <span className="mr-2 inline-block size-3 border border-once bg-once-wash align-middle" />
              Green means seen once.
            </li>
            <li>
              <span className="mr-2 inline-block size-3 border border-twice bg-twice-wash align-middle" />
              Blue means seen twice.
            </li>
            <li>
              <span className="mr-2 inline-block size-3 border border-missed bg-missed-wash align-middle" />
              Red means missed.
            </li>
            <li>
              <span className="mr-2 inline-block size-3 border border-ink bg-signal align-middle" />
              Yellow marks where you are.
            </li>
          </ul>
        </div>
        <Feed />
      </section>

      <section
        aria-labelledby="chapters"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-24"
      >
        <SectionHead id="chapters" eyebrow="The index" title="Eight chapters, eight bugs">
          Each chapter explains one idea in depth, then hands you a program that gets it wrong in
          exactly that way. You fix it, and the checker walks every page to prove the fix.
        </SectionHead>
        <ChapterList />
      </section>

      <section
        aria-labelledby="method"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-24"
      >
        <SectionHead id="method" eyebrow="How a case works" title="Run it, fix it, prove it">
          Every case is a short Python program with one bug in it, and nothing to install beyond uv.
          Here is case 07 from start to finish.
        </SectionHead>
        <ol className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
          {[
            {
              step: 'Run it',
              command: 'uv run python -m crate run 7',
              lines: CASE_SEVEN.run,
              tone: 'text-code-missed',
              note: 'The server said there was more. The client stopped anyway.',
            },
            {
              step: 'Fix it',
              command: 'lab/cases/case07_stop.py',
              lines: CASE_SEVEN.fix,
              tone: 'text-code-ink',
              note: 'Stop on the one signal the server documents.',
            },
            {
              step: 'Prove it',
              command: 'uv run python -m crate check 7',
              lines: CASE_SEVEN.check,
              tone: 'text-code-once',
              note: 'Every record, once, and not one request too many.',
            },
          ].map((card, index) => (
            <li key={card.step} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="folio text-[14px]">{index + 1}</span>
                <span className="display text-[18px] text-ink">{card.step}</span>
              </div>
              <div className="code flex flex-1 flex-col overflow-hidden">
                <div className="truncate border-b border-code-rule px-3.5 py-2 text-[12px] text-code-muted">
                  {card.command}
                </div>
                <pre
                  className={`px-3.5 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] ${card.tone}`}
                >
                  {card.lines.join('\n')}
                </pre>
              </div>
              <p className="text-[14.5px] text-ink-2">{card.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="measured"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-24"
      >
        <SectionHead id="measured" eyebrow="Measured, not guessed" title="What an offset costs">
          The same page, fetched by OFFSET and by cursor, at five depths. And the same feed, read by
          each while the shop changes between pages.
        </SectionHead>
        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <DepthChart />
          <figure className="panel flex min-w-0 flex-col">
            <figcaption className="flex flex-col gap-1 border-b border-rule px-4 py-3">
              <span className="display text-[18px] text-ink">
                A feed that changes while you read
              </span>
              <span className="text-[13.5px] text-muted">
                1,000 records, 20 a page, read to the end. Fixed seeds, so these are exact.
              </span>
            </figcaption>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-[14px]">
                <thead>
                  <tr className="border-b border-rule text-left text-[11.5px] tracking-[0.08em] text-ink-2 uppercase">
                    <th scope="col" className="px-4 py-2.5 font-bold">
                      Between pages
                    </th>
                    <th scope="col" colSpan={2} className="px-3 py-2.5 text-center font-bold">
                      Offset: twice, missed
                    </th>
                    <th scope="col" colSpan={2} className="px-3 py-2.5 text-center font-bold">
                      Cursor: twice, missed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MEASURED.drift.map((row) => (
                    <tr key={row.change} className="border-b border-rule last:border-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink">
                        {row.change}
                      </th>
                      {[...row.offset, ...row.cursor].map((value, index) => (
                        <td
                          key={index}
                          className={`px-3 py-2.5 text-right font-mono text-[13.5px] ${
                            value === 0
                              ? 'text-muted'
                              : index % 2 === 0
                                ? 'font-semibold text-twice'
                                : 'font-semibold text-missed'
                          }`}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
        </div>
        <p className="max-w-2xl text-[14.5px] leading-relaxed text-muted">
          From <code className="font-mono text-[13px] text-ink">crate try deep</code> and{' '}
          <code className="font-mono text-[13px] text-ink">crate try drift</code>. Chapters 04 and
          05 explain every number, and the timings on your machine will differ a little.
        </p>
      </section>

      <section
        aria-labelledby="start"
        className="mx-auto grid max-w-6xl gap-10 px-4 pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start [&>*]:min-w-0"
      >
        <SectionHead id="start" eyebrow="Quick start" title="Four commands to the first bug">
          You need git and uv. uv installs Python 3.13 for you, and the lab uses the standard
          library only. No accounts, no API keys, no Docker.
        </SectionHead>
        <div className="code border-2 border-ink">
          <div className="flex items-center justify-between border-b border-code-rule py-1 pr-1 pl-4">
            <span className="font-sans text-[11.5px] font-bold tracking-[0.12em] text-code-muted uppercase">
              shell
            </span>
            <CopyButton text={QUICKSTART} />
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-relaxed">{QUICKSTART}</pre>
        </div>
      </section>

      <section
        id="checklist"
        aria-labelledby="checklist-title"
        className="mx-auto grid max-w-6xl scroll-mt-6 gap-10 px-4 pt-24 pb-24 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14 [&>*]:min-w-0"
      >
        <div className="flex flex-col gap-6">
          <SectionHead id="checklist-title" eyebrow="Take it with you" title="The checklist">
            Ten rules, one per idea in the workshop. The last chapter ends with the same list.
          </SectionHead>
          <Bram className="size-24" />
        </div>
        <ol className="ruled flex flex-col">
          {CHECKLIST.map((item, index) => (
            <li
              key={item}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-3 border-b border-rule py-3.5"
            >
              <span className="folio text-[13px]">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-[16px] leading-relaxed text-ink">{item}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
