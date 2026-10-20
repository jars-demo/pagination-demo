"""The record shop's stock. The same records, in the same order, on every run and every machine."""

import random
from dataclasses import dataclass

GENRES = ("jazz", "rock", "soul", "folk", "electronic")
PRICES = (900, 1200, 1500, 1800, 2200, 2500, 3000, 4800)  # in pence: 900 is 9.00

FIRST = ["Blue", "Late", "Quiet", "Golden", "Northern", "Paper", "Velvet", "Electric", "Slow"]
SECOND = ["Train", "Hours", "Rooms", "Rivers", "Signals", "Lights", "Weather", "Gardens", "Tides"]
ARTISTS = [
    "The Lanterns",
    "Mara Okafor",
    "Field Recordings",
    "June Halloran",
    "Copper Street",
    "The Night Ferry",
    "Isak Lund",
    "Paloma Reyes",
]


@dataclass(frozen=True)
class Record:
    id: int
    title: str
    artist: str
    genre: str
    price: int  # in pence, so prices add up exactly

    def __str__(self) -> str:
        return f"#{self.id} {self.title}"


def pounds(pence: int) -> str:
    return f"{pence / 100:.2f}"


def make_records(count: int, seed: int = 7) -> list[Record]:
    """`count` records with ids 1 to count. A fixed seed, so everyone sees the same shop."""
    rng = random.Random(seed)
    return [
        Record(
            id=n,
            title=f"{rng.choice(FIRST)} {rng.choice(SECOND)}",
            artist=rng.choice(ARTISTS),
            genre=rng.choice(GENRES),
            price=rng.choice(PRICES),
        )
        for n in range(1, count + 1)
    ]


def ids(records: list[Record]) -> str:
    """A short list of ids for printing: #1 to #20, #31, #40."""
    numbers = sorted(r.id for r in records)
    if not numbers:
        return "none"
    runs: list[tuple[int, int]] = []
    for n in numbers:
        if runs and n == runs[-1][1] + 1:
            runs[-1] = (runs[-1][0], n)
        else:
            runs.append((n, n))
    parts = [f"#{a}" if a == b else f"#{a} to #{b}" for a, b in runs]
    return ", ".join(parts[:6]) + (f" and {len(parts) - 6} more runs" if len(parts) > 6 else "")
