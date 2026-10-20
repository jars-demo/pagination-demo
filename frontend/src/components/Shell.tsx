import Link from 'next/link'

import { REPO_URL } from '@/lib/site'

import { Companion } from './Companion'

// The header, the footer and Bram, shared by every page.

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#ffd23f" />
      <rect x="7" y="8" width="18" height="3.2" fill="#111111" />
      <rect x="7" y="14.4" width="18" height="3.2" fill="#111111" />
      <rect x="7" y="20.8" width="10" height="3.2" fill="#111111" />
    </svg>
  )
}

const NAV = [
  { href: '/workshop', label: 'Chapters', phone: true },
  { href: '/#feed', label: 'The feed', phone: false },
]

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="on-night bg-night text-on-night">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4"
        >
          <Link href="/" className="inline-flex min-h-10 items-center gap-2.5">
            <LogoMark />
            <span className="display text-[19px] leading-none">Every row</span>
            <span className="hidden pt-0.5 text-[13px] text-on-night-muted sm:inline">
              exactly once
            </span>
          </Link>
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href} className={item.phone ? '' : 'hidden sm:block'}>
                <Link
                  href={item.href}
                  className="inline-flex h-10 items-center px-3 text-[14.5px] font-semibold text-on-night hover:bg-night-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={REPO_URL}
                className="ml-1 inline-flex h-10 items-center border border-signal px-3.5 text-[14.5px] font-semibold text-signal hover:bg-signal hover:text-ink"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="on-night border-t-4 border-signal bg-night text-on-night-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-5 pb-24 text-[13.5px] sm:flex-row sm:items-center sm:justify-between">
          <span>Every row, exactly once · MIT licensed</span>
          <a href={REPO_URL} className="inline-flex min-h-10 items-center hover:text-on-night">
            Source on GitHub
          </a>
        </div>
      </footer>
      <Companion />
    </>
  )
}
