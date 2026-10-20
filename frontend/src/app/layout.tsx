import type { Metadata, Viewport } from 'next'
import { Archivo, DM_Mono, Source_Serif_4 } from 'next/font/google'

import { Shell } from '@/components/Shell'

import './globals.css'

const sans = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] })
const serif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
})
const mono = DM_Mono({ variable: '--font-dm-mono', subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: {
    default: 'Every row, exactly once',
    template: '%s · Every row, exactly once',
  },
  description:
    'A hands-on pagination workshop: eight real bugs in one small record shop. Offsets, limits, stable order, keyset cursors, ties, opaque tokens, short pages and syncing changes.',
}

export const viewport: Viewport = { themeColor: '#141414' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only bg-signal px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
