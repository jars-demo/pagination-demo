'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { notesFor, type Question } from '@/lib/bram'

import { BackToTop } from './BackToTop'
import { Bram } from './Bram'

// Bram, in the corner of every page: a note for the page you are on and a two-question quiz.
// Choosing an answer shows whether it is right, with an icon and a word as well as a colour,
// and why. Opens with the button, closes with the button, the cross or Escape.

function Mark({ right }: { right: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      {right ? (
        <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" />
      ) : (
        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2.2" />
      )}
    </svg>
  )
}

function Quiz({ item, number }: { item: Question; number: number }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const answered = chosen !== null
  const right = chosen === item.answer
  return (
    <fieldset className="flex flex-col gap-2 border-t border-rule pt-4">
      <legend className="float-left mb-2 w-full text-[14.5px] leading-snug font-semibold text-ink">
        <span className="mr-1.5 font-mono text-[13px]">Q{number}.</span>
        {item.q}
      </legend>
      {item.options.map((option, index) => {
        const isAnswer = index === item.answer
        const picked = chosen === index
        const look = !answered
          ? 'border-rule-strong bg-surface text-ink hover:border-ink'
          : isAnswer
            ? 'border-once bg-once-wash text-once'
            : picked
              ? 'border-missed bg-missed-wash text-missed'
              : 'border-rule bg-surface text-muted'
        return (
          <button
            key={option}
            type="button"
            disabled={answered}
            aria-pressed={picked}
            onClick={() => setChosen(index)}
            className={`flex min-h-10 items-center justify-between gap-2 border px-3 py-2 text-left text-[14px] leading-snug ${look}`}
          >
            <span>{option}</span>
            {answered && (isAnswer || picked) ? <Mark right={isAnswer} /> : null}
          </button>
        )
      })}
      {answered ? (
        <p role="status" className="text-[14px] leading-relaxed text-ink-2">
          <strong className={right ? 'text-once' : 'text-missed'}>
            {right ? 'Right.' : 'Not quite.'}
          </strong>{' '}
          {item.why}
        </p>
      ) : null}
    </fieldset>
  )
}

export function Companion() {
  const pathname = usePathname()
  const notes = notesFor(pathname)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-3">
      {open ? (
        <section
          id={panelId}
          aria-label="Bram's notes"
          className="flex max-h-[min(36rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden border-2 border-ink bg-surface shadow-[6px_6px_0_0_var(--ink)]"
        >
          <header className="on-night flex items-center gap-3 bg-night px-4 py-3 text-on-night">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-night-2">
              <Bram face className="size-9" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="display text-[18px] leading-tight">Bram</p>
              <p className="text-[12.5px] text-on-night-muted">
                Digs through every crate, in order
              </p>
            </div>
            <button
              type="button"
              aria-label="Close Bram's notes"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center text-on-night-muted hover:bg-night-2 hover:text-on-night"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </header>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-4 pb-5">
            <p className="font-serif text-[16.5px] leading-relaxed text-ink">{notes.note}</p>
            <p className="eyebrow">Quiz yourself</p>
            {notes.quiz.map((item, index) => (
              <Quiz key={`${pathname}-${item.q}`} item={item} number={index + 1} />
            ))}
          </div>
        </section>
      ) : null}
      <div className="flex items-center gap-2">
        <BackToTop />
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen(!open)}
          className="on-night inline-flex h-12 items-center gap-2 border-2 border-ink bg-night pr-4 pl-1.5 text-[14.5px] font-bold text-on-night shadow-[4px_4px_0_0_var(--signal)] hover:bg-night-2"
        >
          <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-night-2">
            <Bram face className="size-8" />
          </span>
          {open ? 'Close' : 'Ask Bram'}
        </button>
      </div>
    </div>
  )
}
