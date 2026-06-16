"""Money — construção Decimal, rejeição de float, arredondamento."""

from __future__ import annotations

from decimal import Decimal

import pytest

from core.money import D, brl, quantize


def test_d_de_int_e_str() -> None:
    assert D(10) == Decimal("10")
    assert D("1.23") == Decimal("1.23")
    assert D(Decimal("5")) == Decimal("5")


def test_d_rejeita_float() -> None:
    with pytest.raises(TypeError):
        D(0.1)  # type: ignore[arg-type]


def test_brl_half_even() -> None:
    # ROUND_HALF_EVEN: 2,675 -> 2,68 (em Decimal exato, 0,5 vai p/ o par)
    assert brl(Decimal("2.5")) == Decimal("2.50")
    assert brl(Decimal("1.005")) == Decimal("1.00")  # arredonda p/ o par (0)
    assert brl(Decimal("1.015")) == Decimal("1.02")  # arredonda p/ o par (2)


def test_quantize_taxa() -> None:
    assert quantize(Decimal("0.00948879"), "0.0001") == Decimal("0.0095")
