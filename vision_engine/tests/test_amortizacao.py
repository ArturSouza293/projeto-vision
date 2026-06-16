"""Amortização — golden (âncoras SAC/Price) + invariante Σamort = principal."""

from __future__ import annotations

from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core import amortizacao as am
from core.money import brl


def test_sac_anchor() -> None:
    # SAC 120k / 120m / 1% a.m.: amort 1000; 1ª prest 2200; última 1010
    tab = am.sac("120000", "0.01", 120)
    assert brl(tab[0].amortizacao) == Decimal("1000.00")
    assert brl(tab[0].prestacao) == Decimal("2200.00")
    assert brl(tab[-1].prestacao) == Decimal("1010.00")
    assert brl(tab[-1].saldo_final) == Decimal("0.00")


def test_price_prestacao_constante() -> None:
    tab = am.price("100000", "0.01", 120)
    # prestação constante (exceto a última, que zera o saldo) — tol 1 centavo
    base = tab[0].prestacao
    assert all(abs(p.prestacao - base) <= Decimal("0.01") for p in tab[:-1])
    assert brl(tab[-1].saldo_final) == Decimal("0.00")


def test_americano_bullet() -> None:
    tab = am.americano("50000", "0.012", 6)
    assert all(p.amortizacao == 0 for p in tab[:-1])
    assert brl(tab[-1].amortizacao) == Decimal("50000.00")
    assert brl(tab[0].juros) == Decimal("600.00")  # 50000 * 1,2%


# -------------------------------------------------------------- invariantes
principais = st.integers(min_value=1000, max_value=10**7).map(Decimal)
taxas = st.integers(min_value=1, max_value=300).map(lambda x: Decimal(x) / Decimal(10000))
prazos = st.integers(min_value=1, max_value=420)


@given(principais, taxas, prazos)
def test_price_soma_amortizacoes_igual_principal(p: Decimal, i: Decimal, n: int) -> None:
    tab = am.price(p, i, n)
    # "a menos de centavos de arredondamento" (brief §9): igualdade ao centavo.
    assert brl(sum((x.amortizacao for x in tab), Decimal(0))) == brl(p)
    assert tab[-1].saldo_final == 0


@given(principais, taxas, prazos)
def test_sac_soma_amortizacoes_igual_principal(p: Decimal, i: Decimal, n: int) -> None:
    tab = am.sac(p, i, n)
    assert brl(sum((x.amortizacao for x in tab), Decimal(0))) == brl(p)
    assert tab[-1].saldo_final == 0


@given(principais, taxas, prazos)
def test_prestacao_igual_juros_mais_amort(p: Decimal, i: Decimal, n: int) -> None:
    for tab in (am.price(p, i, n), am.sac(p, i, n)):
        assert all(x.prestacao == x.juros + x.amortizacao for x in tab)
