import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { headingsOf, slugify } from '@/components/Markdown'
import { NOTE_SLUGS, notesFor } from '@/lib/bram'
import { CASE_FOUR, CASE_SEVEN, CASES, CHECKLIST, MEASURED } from '@/lib/site'
import { CHAPTERS, findChapter } from '@/lib/workshop'

const ROOT = path.join(process.cwd(), '..')
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const body = (slug: string) => findChapter(slug)?.body ?? ''

describe('chapters', () => {
  it('has eight chapters numbered in order', () => {
    expect(CHAPTERS.map((chapter) => Number(chapter.number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it.each(CHAPTERS.map((chapter) => [chapter.slug, chapter] as const))(
    '%s has a summary, a time, the standard sections and its own case',
    (_slug, chapter) => {
      expect(chapter.summary.length).toBeGreaterThan(10)
      expect(chapter.minutes).toBeGreaterThan(0)
      expect(chapter.body).toMatch(/^## Goal$/m)
      expect(chapter.body).toMatch(/^## The case$/m)
      expect(chapter.body).toMatch(/^## Fix the case$/m)
      expect(chapter.body).toMatch(/^## Check it works$/m)
      expect(chapter.body).toMatch(/^## Exercise$/m)
      expect(chapter.body).toContain(`crate run ${Number(chapter.number)}`)
      expect(chapter.body).toContain(`crate check ${Number(chapter.number)}`)
    },
  )

  it('adds up to between two and three hours', () => {
    const minutes = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0)
    expect(minutes).toBe(155)
  })

  it('only mentions lab files that exist', () => {
    const mentioned = new Set(
      CHAPTERS.flatMap((chapter) =>
        [...chapter.body.matchAll(/`(lab\/[\w./-]+\.\w+)`/g)].map((m) => m[1] ?? ''),
      ),
    )
    expect(mentioned.size).toBeGreaterThan(7)
    for (const file of mentioned) {
      expect(fs.existsSync(path.join(ROOT, file)), `${file} is missing`).toBe(true)
    }
  })

  it('shows check output exactly as the checker words it', () => {
    const checks = read('lab/crate/checks.py')
    const labels = CHAPTERS.flatMap((chapter) =>
      [...chapter.body.matchAll(/^ {2}PASS {2}(.+)$/gm)].map((m) => m[1] ?? ''),
    )
    expect(labels.length).toBe(36)
    for (const label of labels) {
      // A measured value at the end is filled in by an f-string; compare the fixed part.
      expect(checks, label).toContain(label.replace(/ \([^()]*\)$/, ''))
    }
  })

  it('names only experiments the lab has, each in some chapter', () => {
    const experiments = read('lab/crate/experiments.py')
    const named = CHAPTERS.flatMap((chapter) =>
      [...chapter.body.matchAll(/crate try ([\w-]+)/g)].map((m) => m[1] ?? ''),
    )
    expect(new Set(named)).toEqual(new Set(['page-size', 'drift', 'deep', 'count']))
    for (const name of named) expect(experiments).toContain(`"${name}":`)
  })

  it('never uses a dash where a sentence should end', () => {
    for (const chapter of CHAPTERS) expect(chapter.body, chapter.slug).not.toMatch(/[–—]/)
  })

  it('ends with the same checklist the home page shows', () => {
    const last = body('08-syncing-changes').replace(/`/g, '')
    for (const item of CHECKLIST) expect(last).toContain(item)
  })
})

describe('cases', () => {
  it('has one case per chapter, titled as the lab titles it', () => {
    const cli = read('lab/crate/__main__.py')
    expect(CASES.map((item) => item.number)).toEqual(CHAPTERS.map((chapter) => chapter.number))
    for (const item of CASES) {
      expect(cli).toContain(`"${item.title}"`)
    }
  })

  it('shows each symptom as it appears in its chapter', () => {
    for (const item of CASES) {
      const chapter = CHAPTERS.find((c) => c.number === item.number)
      expect(chapter?.body, item.number).toContain(item.symptom)
    }
  })

  it('shows the case 04 run as chapter 04 prints it', () => {
    for (const line of [...CASE_FOUR.setup, CASE_FOUR.read, CASE_FOUR.twice, CASE_FOUR.missed]) {
      expect(body('04-cursors')).toContain(line)
    }
  })

  it('shows the case 07 walkthrough as the lab prints and fixes it', () => {
    for (const line of CASE_SEVEN.run) expect(body('07-knowing-when-to-stop')).toContain(line)
    for (const line of CASE_SEVEN.check) {
      expect(body('07-knowing-when-to-stop')).toContain(`  ${line}`)
    }
    for (const line of CASE_SEVEN.fix) {
      expect(read('lab/tests/solutions/case07_stop.py')).toContain(line)
    }
  })

  it('links headings by a stable slug', () => {
    expect(slugify("Ties have no order: don't guess")).toBe('ties-have-no-order-dont-guess')
    expect(
      headingsOf('## Goal\n```\n## not a heading\n```\n## Check it works').map((h) => h.id),
    ).toEqual(['goal', 'check-it-works'])
  })
})

describe('measured numbers', () => {
  it('quotes each depth timing exactly as chapter 05 prints it', () => {
    const chapter = body('05-keyset-ties')
    for (const row of MEASURED.deep) {
      expect(chapter, row.depth).toMatch(
        new RegExp(`  ${row.depth}\\s+${row.offset}\\s+${row.cursor}\\s+${row.ratio}\\n`),
      )
    }
    expect(chapter).toContain(MEASURED.machine)
  })

  it('quotes each drift count exactly as chapter 04 prints it', () => {
    const chapter = body('04-cursors')
    for (const row of MEASURED.drift) {
      const cells = [...row.offset, ...row.cursor].map((n) => String(n).padStart(8)).join(' ')
      expect(chapter, row.change).toContain(`  ${row.change.padEnd(20)} ${cells}`)
    }
  })

  it('quotes each count timing exactly as chapter 07 prints it', () => {
    const chapter = body('07-knowing-when-to-stop')
    for (const row of MEASURED.count) {
      expect(chapter, row.records).toMatch(
        new RegExp(`  ${row.records}\\s+${row.count}\\s+${row.page}\\s+${row.ratio}\\n`),
      )
    }
  })

  it('uses the same machine in every chapter that times something', () => {
    for (const slug of ['02-limits', '05-keyset-ties', '07-knowing-when-to-stop']) {
      expect(body(slug), slug).toContain(MEASURED.machine)
    }
  })
})

describe("Bram's notes", () => {
  it('has notes for every chapter and none for chapters that do not exist', () => {
    expect([...NOTE_SLUGS].sort()).toEqual(CHAPTERS.map((chapter) => chapter.slug))
  })

  it('picks the notes for the page you are on', () => {
    expect(notesFor('/workshop/05-keyset-ties').quiz[0]?.q).toContain('(900, 52)')
    expect(notesFor('/workshop').quiz.length).toBe(2)
    expect(notesFor('/')).toBe(notesFor('/no-such-page'))
  })

  it.each([
    ['/', '/'],
    ['/workshop', '/workshop'],
    ...NOTE_SLUGS.map((slug) => [slug, `/workshop/${slug}`]),
  ])('asks %s two questions with exactly one right answer each', (_name, pathname) => {
    const quiz = notesFor(pathname).quiz
    expect(quiz.length).toBe(2)
    for (const item of quiz) {
      expect(item.options.length).toBeGreaterThanOrEqual(3)
      expect(new Set(item.options).size).toBe(item.options.length)
      expect(item.options[item.answer], item.q).toBeDefined()
      expect(item.why.length).toBeGreaterThan(20)
    }
  })
})
