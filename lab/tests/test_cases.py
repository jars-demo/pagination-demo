"""Every case fails its check as shipped, and passes once fixed. The fixes live in solutions/."""

import importlib

import pytest

from crate.__main__ import CASES
from crate.checks import CHECKS


@pytest.mark.parametrize("number", list(CASES))
def test_case_is_broken_as_shipped(number):
    case = importlib.import_module(f"cases.{CASES[number][0]}")

    results = CHECKS[number](case)

    assert not all(ok for _, ok in results)


@pytest.mark.parametrize("number", list(CASES))
def test_case_passes_with_a_real_fix(number):
    fixed = importlib.import_module(f"tests.solutions.{CASES[number][0]}")

    failed = [label for label, ok in CHECKS[number](fixed) if not ok]

    assert failed == []


@pytest.mark.parametrize("number", list(CASES))
def test_case_runs_and_prints_its_symptom(number, capsys):
    importlib.import_module(f"cases.{CASES[number][0]}").run()

    assert len(capsys.readouterr().out.splitlines()) >= 4
