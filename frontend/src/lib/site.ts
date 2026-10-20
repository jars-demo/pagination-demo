// Facts shown on the site. Every symptom and number is real output from the lab:
// `uv run python -m crate run N` and `crate try`. A unit test compares each one with the chapters.

export const REPO_URL = 'https://github.com/jars-demo/pagination-demo'
export const SITE_URL = 'https://pagination.jishanahmed.in'

export type Case = {
  number: string
  title: string
  topics: string
  symptom: string
}

export const CASES: readonly Case[] = [
  {
    number: '01',
    title: 'The first page nobody saw',
    topics: 'offsets, page numbers, edges',
    symptom: 'records shown:       80\nnever shown:         #1 to #20',
  },
  {
    number: '02',
    title: 'The page with every record',
    topics: 'limits, defaults, page size',
    symptom: 'GET /records?limit=1000000   200  50,000 records   4,996.5 KB',
  },
  {
    number: '03',
    title: 'Musical chairs',
    topics: 'total order, tie-breakers',
    symptom: 'different records: 95\nshown twice:       5',
  },
  {
    number: '04',
    title: 'The feed that repeated itself',
    topics: 'offset drift, keyset cursors',
    symptom: 'shown twice:  6  (#44 to #46, #51 to #53)\nnever shown:  3  (#24 to #26)',
  },
  {
    number: '05',
    title: 'The price that hid records',
    topics: 'composite keys, deep pages',
    symptom: 'records shown:  70 of 100\nnever shown:    30',
  },
  {
    number: '06',
    title: 'The cursor that forgot the question',
    topics: 'opaque tokens, versioning',
    symptom: 'page 2:   2 of 10 are jazz   prices 9.00 to 9.00',
  },
  {
    number: '07',
    title: 'The client that gave up early',
    topics: 'short pages, has more, counts',
    symptom: 'records for sale:   189\nrecords downloaded: 18',
  },
  {
    number: '08',
    title: 'The update the sync never saw',
    topics: 'change feeds, versions, clocks',
    symptom: '#3   shop 36.00   mirror   30.00   WRONG',
  },
]

// Measured with `crate try deep` and `crate try count` on one machine, and computed with
// `crate try drift`, which uses fixed seeds, so anyone who runs it sees the same numbers.
export const MEASURED = {
  machine: 'Python 3.13.16, SQLite 3.45.1, Linux, 4 CPUs',
  deep: [
    { depth: '0', offset: '0.014 ms', cursor: '0.014 ms', ratio: '1x' },
    { depth: '1,000', offset: '0.030 ms', cursor: '0.014 ms', ratio: '2x' },
    { depth: '10,000', offset: '0.093 ms', cursor: '0.014 ms', ratio: '6x' },
    { depth: '100,000', offset: '0.917 ms', cursor: '0.019 ms', ratio: '49x' },
    { depth: '199,980', offset: '2.151 ms', cursor: '0.012 ms', ratio: '174x' },
  ],
  drift: [
    { change: 'nothing changes', offset: [0, 0], cursor: [0, 0] },
    { change: '1 new record', offset: [52, 0], cursor: [0, 0] },
    { change: '5 new records', offset: [330, 0], cursor: [0, 0] },
    { change: '1 seen record sold', offset: [0, 47], cursor: [0, 0] },
    { change: '3 seen records sold', offset: [0, 129], cursor: [0, 0] },
  ],
  count: [
    { records: '10,000', count: '0.102 ms', page: '0.029 ms', ratio: '4x' },
    { records: '100,000', count: '0.556 ms', page: '0.018 ms', ratio: '32x' },
    { records: '1,000,000', count: '5.520 ms', page: '0.017 ms', ratio: '328x' },
  ],
} as const

export const CHECKLIST: readonly string[] = [
  'Count pages from 1 for people and from 0 for code, and convert in one place.',
  'Give every list a default limit and a maximum, and refuse or clamp anything outside them.',
  'End every ORDER BY with a unique column, so the order is total.',
  'Use a cursor, not an offset, for any list that changes while people read it.',
  'Make the cursor the whole sort key, and seek strictly after it.',
  'Keep cursors opaque, and put the whole query inside them: filters, sort and direction.',
  'Return a next cursor, and let only its absence mean the end.',
  'Fetch one row more than the page to know if there is a next one. Count only when someone needs the number.',
  'Sync changes by a version that only goes up and that no two writes share, never by a timestamp.',
  'Test pagination by walking every page while the data changes, and check each row appears exactly once.',
]

export const LEARN: readonly { title: string; text: string }[] = [
  {
    title: 'Turn a page number into rows',
    text: 'Offsets, limits and the edges: page 0, the last page and the page after it.',
  },
  {
    title: 'Make an order total',
    text: 'Why ties come back in any order, and the one column that fixes it.',
  },
  {
    title: 'Page with a cursor',
    text: 'Remember the last row, not the count, so new and deleted rows cannot shift the pages.',
  },
  {
    title: 'Design the token',
    text: 'Opaque, versioned cursors that carry the whole question and refuse the wrong one.',
  },
  {
    title: 'Know when to stop',
    text: 'Short pages, empty pages, limit plus one, and what a total count really costs.',
  },
  {
    title: 'Sync what changed',
    text: 'Why a timestamp loses updates, and the value that only goes up.',
  },
]

export const QUICKSTART = `git clone https://github.com/jars-demo/pagination-demo.git
cd pagination-demo/lab
uv sync
uv run python -m crate run 1`

// Real output of `crate run 7`, then `crate check 7` once the client follows `next`.
export const CASE_SEVEN = {
  run: [
    'records for sale:   189',
    'records downloaded: 18',
    'requests made:      1',
    "last reply:         18 records, next = '20'",
  ],
  fix: ['if page.next is None:', 'break  # only the server knows where the end is'],
  check: [
    'PASS  every record for sale is downloaded, once (189 of 189)',
    'PASS  it stops when next is None: 12 requests, no more (12)',
    'PASS  an empty page in the middle does not stop it',
    'PASS  a single short last page takes one request',
  ],
}

// Real output of `crate run 4`, shown on the home page.
export const CASE_FOUR = {
  setup: [
    'records when the collector started: 60  (#1 to #60)',
    'while they read: 3 new arrivals after pages 1 and 2, 3 sales after page 4',
  ],
  read: 'rows read from the feed: 63',
  twice: 'shown twice:  6  (#44 to #46, #51 to #53)',
  missed: 'never shown:  3  (#24 to #26)',
}
