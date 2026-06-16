"""TVM — golden (âncoras HP-12C, idênticas ao motor TS) + property-based."""

from __future__ import annotations

from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core import tvm


def close(a: Decimal, b: str, tol: str = "0.01") -> bool:
    return abs(Decimal(a) - Decimal(b)) <= Decimal(tol)


def close_rel(a: Decimal, b: Decimal, rel: str = "1e-12") -> bool:
    diff = abs(Decimal(a) - Decimal(b))
    base = abs(Decimal(b)) if b != 0 else Decimal(1)
    return diff <= Decimal(rel) * base


# ---------------------------------------------------------------- golden
def test_anual_para_mensal() -> None:
    # 12% a.a. -> 0,948879% a.m.
    assert close(tvm.anual_para_mensal("0.12"), "0.00948879", "0.0000001")


def test_mensal_para_anual_inverso() -> None:
    assert close_rel(tvm.mensal_para_anual(tvm.anual_para_mensal("0.12")), Decimal("0.12"))


def test_fisher_real() -> None:
    # nominal 10% / inflação 4% -> real 5,76923%
    assert close(tvm.taxa_real("0.10", "0.04"), "0.0576923", "0.0000001")


def test_vf_single_sum() -> None:
    # FV(1000; 1%; 12) juros compostos -> 1126,83
    assert close(tvm.vf("1000", "0.01", 12), "1126.83", "0.01")


def test_vf_anuidade_end() -> None:
    assert close(tvm.vf_anuidade("1000", "0.01", 12), "12682.50")


def test_vf_anuidade_begin() -> None:
    # antecipada = postecipada * (1+i)
    assert close(tvm.vf_anuidade("1000", "0.01", 12, "begin"), "12809.33")


def test_vp_anuidade_price_anchor() -> None:
    # PV de 360 parcelas de 1000 a 0,5% (base do PV de financiamento Price)
    assert close(tvm.vp_anuidade("1000", "0.005", 360), "166791.61")


def test_growing_annuity_g_equals_i() -> None:
    # caso degenerado g = i -> VP = n*C/(1+i)
    assert close(tvm.pv_growing_annuity("100", "0.05", "0.05", 10), "952.38")


def test_fator_du_252() -> None:
    # 252 dias úteis = 1 ano -> fator = (1+i)
    assert close_rel(tvm.fator_du("0.1440", 252), Decimal("1.1440"))


def test_perpetuidade() -> None:
    assert close(tvm.perpetuidade("100", "0.10"), "1000.00")


# ---------------------------------------------------------------- property
amounts = st.integers(min_value=1, max_value=10**8).map(Decimal)
rates = st.integers(min_value=1, max_value=500).map(lambda x: Decimal(x) / Decimal(10000))
periods = st.integers(min_value=1, max_value=360)


@given(amounts, rates, periods)
def test_vp_vf_roundtrip(x: Decimal, i: Decimal, n: int) -> None:
    assert close_rel(tvm.vp(tvm.vf(x, i, n), i, n), x, "1e-15")


@given(rates)
def test_fisher_roundtrip(i: Decimal) -> None:
    real = tvm.taxa_real(i, Decimal("0.04"))
    assert close_rel(tvm.taxa_nominal(real, Decimal("0.04")), i, "1e-18")


@given(amounts, rates, periods)
def test_begin_equals_end_times_factor(pmt: Decimal, i: Decimal, n: int) -> None:
    end = tvm.vf_anuidade(pmt, i, n, "end")
    begin = tvm.vf_anuidade(pmt, i, n, "begin")
    assert close_rel(begin, end * (Decimal(1) + i), "1e-15")
