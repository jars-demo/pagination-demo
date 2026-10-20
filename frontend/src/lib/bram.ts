// Bram, the badger who digs through the shop's crates of records. For each page: a short note
// and two quiz questions, each with one right answer and the reason it is right.

export type Question = {
  q: string
  options: readonly string[]
  answer: number
  why: string
}

export type Notes = { note: string; quiz: readonly Question[] }

const HOME: Notes = {
  note: 'I am Bram. Badgers dig through things in order and never lose their place, which is the whole of pagination. Try the moving feed on this page: play the busy pattern by offset, then by cursor, and count the blue and red rows.',
  quiz: [
    {
      q: 'You read page 1 of a newest-first feed. Two records arrive. You ask for page 2 by offset. What happens?',
      options: [
        'Page 2 is exactly right',
        'The last two records of page 1 appear again',
        'Two records are skipped',
      ],
      answer: 1,
      why: 'The arrivals push every row down by two, so skipping one page of rows lands two rows early. Arrivals above you mean repeats. Removals above you mean skips.',
    },
    {
      q: 'What does a cursor remember?',
      options: [
        'How many rows came before the page',
        'The sort key of the last row you saw',
        'The total number of rows',
      ],
      answer: 1,
      why: 'The next page is "the rows after this one". Rows added or removed elsewhere cannot move that position, which is why cursors survive a busy list.',
    },
  ],
}

const WORKSHOP: Notes = {
  note: 'Eight chapters, in order. The first three work with page numbers. From chapter 04 on, you page with cursors, and the bugs get subtler. Each chapter takes 15 to 25 minutes.',
  quiz: [
    {
      q: 'Which of these is a sign that a list needs pagination?',
      options: ['It is sorted', 'It can grow without limit', 'It is shown in a table'],
      answer: 1,
      why: 'A list that can grow without limit will one day be too big to read, send or draw in one go. Paginate it before that day, not after.',
    },
    {
      q: 'What does every check in this workshop test?',
      options: [
        'That the code is short',
        'That every row is shown exactly once, in order',
        'That the pages load quickly',
      ],
      answer: 1,
      why: 'That is the promise of pagination. Some checks also test cost, but no check passes if a row is lost or repeated.',
    },
  ],
}

const CHAPTER_NOTES: Record<string, Notes> = {
  '01-pages-and-offsets': {
    note: 'People count pages from 1. Lists count from 0. Write out page 1, 2 and 3 by hand before you write the formula, and the off-by-one has nowhere to hide.',
    quiz: [
      {
        q: 'With 20 rows a page, where does page 3 start?',
        options: ['Index 60', 'Index 40', 'Index 41'],
        answer: 1,
        why: 'Page 1 starts at 0, page 2 at 20 and page 3 at 40: (page - 1) times the size.',
      },
      {
        q: 'How many pages do 101 rows make, at 20 a page?',
        options: ['5', '6', '5, with one row lost'],
        answer: 1,
        why: 'ceil(101 / 20) is 6. The sixth page holds a single row, and that is normal.',
      },
    ],
  },
  '02-limits': {
    note: 'The limit comes from the URL, so it is input like any other. Watch for the negative one: in Python, records[0:-5] is nearly everything.',
    quiz: [
      {
        q: 'A server caps the limit with min(limit, 100). Which request still gets too much?',
        options: ['limit=1000', 'limit=-5', 'limit=50'],
        answer: 1,
        why: 'min(-5, 100) is -5, and a slice that ends at -5 keeps all but the last five rows. A limit needs a minimum as well as a maximum.',
      },
      {
        q: 'A server clamps limit=1000 down to 100. Which client breaks?',
        options: [
          'One that follows next until it is empty',
          'One that stops when it gets fewer rows than it asked for',
          'Neither',
        ],
        answer: 1,
        why: 'It asked for 1,000, got 100 and decided that was the last page. Only the next cursor should mean "there is more".',
      },
    ],
  },
  '03-stable-order': {
    note: 'ORDER BY price says nothing about the order of two records at the same price. The database may change its mind between page 1 and page 2. Add a unique column last.',
    quiz: [
      {
        q: 'Which ORDER BY gives a total order?',
        options: ['ORDER BY price, title', 'ORDER BY price, id', 'ORDER BY price DESC'],
        answer: 1,
        why: 'Only a unique column breaks every tie. Titles repeat, so price and title can still tie.',
      },
      {
        q: 'Nothing changes between two page requests, yet a row appears twice. The likely cause?',
        options: [
          'The order has ties, and they came back in a different order',
          'The offset was too large',
          'The database is out of memory',
        ],
        answer: 0,
        why: 'Each page is a new query. If ties are ordered differently each time, rows near the cut can land on both sides of it, or on neither.',
      },
    ],
  },
  '04-cursors': {
    note: 'An offset counts rows, so anything added or removed above you moves your place. A cursor remembers the row itself. It also lets the database seek straight there.',
    quiz: [
      {
        q: 'You read a newest-first feed by offset. A record you already saw is deleted. What happens next?',
        options: ['A record is shown twice', 'A record is skipped', 'Nothing'],
        answer: 1,
        why: 'Every row below the deleted one moves up by one, so one row slides across the page boundary into the part you already skipped.',
      },
      {
        q: 'What do you give up with cursor pagination?',
        options: [
          'Correct pages when rows are added',
          'Jumping straight to page 7',
          'Sorting by id',
        ],
        answer: 1,
        why: 'A cursor only knows "after this row". There is no page number to jump to, and no cheap way to say how many pages there are.',
      },
    ],
  },
  '05-keyset-ties': {
    note: 'If the cursor holds only the price, every record at that price which did not fit on the page falls through a trap door. The cursor must be the whole key: price and id.',
    quiz: [
      {
        q: 'The cursor is (900, 52). Which condition gives the next page?',
        options: ['price > 900', 'price >= 900', '(price, id) > (900, 52)'],
        answer: 2,
        why: 'price > 900 skips the rest of the 9.00 records. price >= 900 repeats them. The pair comparison starts exactly after the last row.',
      },
      {
        q: 'Why is a deep cursor page fast?',
        options: [
          'The database caches the earlier pages',
          'An index on the sort key lets it seek straight to the cursor',
          'Cursors return fewer rows',
        ],
        answer: 1,
        why: 'With an index on (price, id) the database jumps to the position and reads one page. An offset has to read every row it skips.',
      },
    ],
  },
  '06-opaque-cursors': {
    note: 'Decode the cursor and look inside. If the filter and the sort are not in it, the second page has to guess them. Base64 is encoding, not encryption.',
    quiz: [
      {
        q: 'A client sends a jazz cursor with genre=rock. What should the server do?',
        options: [
          'Use the cursor and ignore the genre',
          'Use the genre and ignore the cursor',
          'Refuse the request with a 400',
        ],
        answer: 2,
        why: 'The cursor points into the jazz list. Mixing it with another question gives an answer to neither, so say so clearly.',
      },
      {
        q: 'Why put a version number inside a cursor?',
        options: [
          'So clients can read it',
          'So the server can change the format and still handle old cursors',
          'To make it longer',
        ],
        answer: 1,
        why: 'Cursors outlive deploys: they sit in open tabs and running jobs. A version lets the new code read or clearly refuse the old ones.',
      },
    ],
  },
  '07-knowing-when-to-stop': {
    note: 'A short page is not the last page. Neither is an empty one. The server says where the end is by leaving next empty. Ask for one row more than the page to know if there is more.',
    quiz: [
      {
        q: 'A page holds 0 records and next is "120". What should the client do?',
        options: ['Stop: the list is empty', 'Ask for the next page', 'Retry the same page'],
        answer: 1,
        why: 'The server filtered out every row on that page, but it says there is more. Only an empty next means the end.',
      },
      {
        q: 'How can a server know there is a next page without counting?',
        options: [
          'Fetch limit + 1 rows and check for the extra one',
          'Assume a full page means more',
          'Run COUNT(*) on every request',
        ],
        answer: 0,
        why: 'The extra row proves there is more. Drop it before sending. A full page only might mean more, and a count reads every match.',
      },
    ],
  },
  '08-syncing-changes': {
    note: 'Twenty-five writes in one second, and a timestamp cursor. Then a write that lands in a second the sync has already passed. A version that only goes up fixes both.',
    quiz: [
      {
        q: 'Why can a sync keyed on updated_at miss an update forever?',
        options: [
          'Timestamps are too large to compare',
          'A write can get a timestamp the bookmark has already passed',
          'updated_at cannot be indexed',
        ],
        answer: 1,
        why: 'Whole seconds, clock differences between servers and slow transactions all let a change land behind the bookmark, where no later sync looks.',
      },
      {
        q: 'Why must a sync be idempotent?',
        options: [
          'So it runs faster',
          'So copying the same row twice is harmless, and reading a bit too much is safe',
          'So it can skip deletes',
        ],
        answer: 1,
        why: 'Safety lags and overlaps re-read rows on purpose. If a second copy does no harm, reading too much is fine and only reading too little is a bug.',
      },
    ],
  },
}

export const NOTE_SLUGS = Object.keys(CHAPTER_NOTES)

export function notesFor(pathname: string): Notes {
  if (pathname === '/workshop') return WORKSHOP
  const slug = pathname.startsWith('/workshop/') ? pathname.slice('/workshop/'.length) : ''
  return CHAPTER_NOTES[slug] ?? HOME
}
