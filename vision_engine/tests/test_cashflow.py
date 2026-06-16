"""Fluxos de caixa — VPL/TIR golden + invariante VPL(TIR) ≈ 0."""

from __future__ import annotations

from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core import cashflow as cf


def test_npv_basico() -> None:
    # -1000 hoje, +1100 em 1 período, a 10% -> VPL = 0
    assert abs(cf.npv("0.10", ["-1000", "1100"])) <= Decimal("1e-12")


def test_irr_simples() -> None:
    # -1000, +1100 -> TIR = 10%
    assert abs(cf.irr(["-1000", "1100"]) - Decimal("0.10")) <= Decimal("1e-9")


def test_irr_multiperiodo() -> None:
    # -1000, +600, +600 -> TIR ~ 13,066%
    r = cf.irr(["-1000", "600", "600"])
    assert abs(cf.npv(r, ["-1000", "600", "600"])) <= Decimal("1e-6")


def test_payback_simples() -> None:
    # -1000, +400, +400, +400 -> paga no período 2,5
    pb = cf.payback_simples(["-1000", "400", "400", "400"])
    assert pb is not None and abs(pb - Decimal("2.5")) <= Decimal("1e-9")


def test_mtir_definida() -> None:
    m = cf.mtir(["-1000", "500", "500", "500"], "0.10", "0.08")
    assert m > 0


# -------------------------------------------------------------- invariante
@given(
    st.integers(min_value=100, max_value=10**6).map(lambda x: Decimal(-x)),
    st.lists(
        st.integers(min_value=1, max_value=10**6).map(Decimal),
        min_size=1,
        max_size=8,
    ),
)
def test_npv_no_irr_e_zero(invest: Decimal, entradas: list[Decimal]) -> None:
    fluxos = [invest, *entradas]
    # só testa quando há TIR real (VPL muda de sinal): soma das entradas > |invest|
    if sum(entradas, Decimal(0)) <= -invest:
        return
    r = cf.irr(fluxos)
    assert abs(cf.npv(r, fluxos)) <= Decimal("1e-6")
