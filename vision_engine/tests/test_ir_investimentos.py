"""IR investimentos — golden (PDF) + invariantes."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core.money import brl
from params.loader import load_params
from tax import ir_investimentos as iri

P = load_params("ir_investimentos", date(2026, 6, 1)).dados


def test_aliquota_regressiva_por_prazo() -> None:
    assert iri.aliquota_renda_fixa(100, P) == Decimal("0.225")
    assert iri.aliquota_renda_fixa(200, P) == Decimal("0.20")
    assert iri.aliquota_renda_fixa(400, P) == Decimal("0.175")
    assert iri.aliquota_renda_fixa(800, P) == Decimal("0.15")


def test_ir_renda_fixa() -> None:
    assert brl(iri.ir_renda_fixa(Decimal("1000"), 100, P)) == Decimal("225.00")
    assert brl(iri.ir_renda_fixa(Decimal("1000"), 800, P)) == Decimal("150.00")
    assert iri.ir_renda_fixa(Decimal("-5"), 100, P) == 0  # rendimento ≤ 0


def test_isencao_pf() -> None:
    assert iri.is_isento_pf("LCI", P) and iri.is_isento_pf("lca", P)
    assert not iri.is_isento_pf("CDB", P)


def test_come_cotas() -> None:
    assert iri.aliquota_come_cotas(True, P) == Decimal("0.15")
    assert iri.aliquota_come_cotas(False, P) == Decimal("0.20")


def test_fii_ganho() -> None:
    assert brl(iri.ir_fii_ganho_venda(Decimal("1000"), P)) == Decimal("200.00")


def test_acoes() -> None:
    assert iri.ir_acoes_swing(Decimal("1000"), Decimal("15000"), P) == 0  # isento ≤ 20k
    assert brl(iri.ir_acoes_swing(Decimal("1000"), Decimal("25000"), P)) == Decimal("150.00")
    assert brl(iri.ir_acoes_day_trade(Decimal("1000"), P)) == Decimal("200.00")


def test_jcp_e_exterior() -> None:
    assert brl(iri.ir_jcp(Decimal("1000"), P)) == Decimal("150.00")
    assert brl(iri.ir_exterior(Decimal("1000"), P)) == Decimal("150.00")


@given(
    st.integers(min_value=0, max_value=10**7).map(Decimal),
    st.integers(min_value=1, max_value=3000),
)
def test_ir_rf_dentro_da_nominal(rend: Decimal, dias: int) -> None:
    ir = iri.ir_renda_fixa(rend, dias, P)
    assert Decimal(0) <= ir <= rend * Decimal("0.225")
