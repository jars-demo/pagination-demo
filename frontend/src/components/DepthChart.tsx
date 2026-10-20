import { MEASURED } from '@/lib/site'

// Fig. 1: the time for one page of 20 at each depth, OFFSET against a cursor, measured with
// `crate try deep`. Bars share one scale, so the cursor bars stay a sliver at every depth.

const ms = (shown: string) => Number(shown.replace(' ms', ''))

export function DepthChart() {
  const top = Math.max(...MEASURED.deep.map((row) => ms(row.offset)))
  return (
    <figure className="panel flex min-w-0 flex-col">
      <figcaption className="flex flex-col gap-1 border-b border-rule px-4 py-3">
        <span className="display text-[18px] text-ink">One page of 20, at each depth</span>
        <span className="text-[13.5px] text-muted">
          SQLite, 200,000 records. {MEASURED.machine}.
        </span>
      </figcaption>
      <ol className="flex flex-col gap-4 px-4 py-5">
        {MEASURED.deep.map((row, index) => (
          <li key={row.depth} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="font-semibold text-ink">{row.depth} rows before the page</span>
              <span className="font-mono text-[12.5px] text-ink-2">OFFSET is {row.ratio}</span>
            </div>
            {[
              { name: 'OFFSET', value: row.offset, fill: 'bg-ink' },
              { name: 'cursor', value: row.cursor, fill: 'bg-signal border border-ink' },
            ].map((bar) => (
              <div
                key={bar.name}
                className="grid grid-cols-[3.75rem_minmax(0,1fr)_4.75rem] items-center gap-2"
              >
                <span className="text-[12px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                  {bar.name}
                </span>
                <span className="h-3 bg-surface-2">
                  <span
                    className={`bar-grow block h-full ${bar.fill}`}
                    style={{
                      width: `${Math.max(1.5, (ms(bar.value) / top) * 100)}%`,
                      ['--at' as string]: `${index * 90}ms`,
                    }}
                  />
                </span>
                <span className="text-right font-mono text-[12.5px] text-ink">{bar.value}</span>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </figure>
  )
}
