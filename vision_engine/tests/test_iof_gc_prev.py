"""IOF, ganho de capital e previdência — golden (PDF) + invariantes."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from core.money import brl
from params.loader import load_params
from tax import ganho_capital as gc
from tax import iof
from tax import previdencia as prev

IOF = load_params("iof", date(2026, 6, 1)).dados
GC = load_params("ganho_capital", date(2026, 6, 1)).dados
PREV = load_params("previdencia", date(2026, 6, 1)).dados


# ---------------------------------------------------------------- IOF
def test_iof_aliquota_vetor() -> None:
    assert iof.iof_aliquota(1, IOF) == Decimal("0.96")
    assert iof.iof_aliquota(15, IOF) == Decimal("0.50")
    assert iof.iof_aliquota(29, IOF) == Decimal("0.03")
    assert iof.iof_aliquota(30, IOF) == Decimal("0.0")
    assert iof.iof_aliquota(60, IOF) == Decimal("0.0")


def test_iof_resgate() -> None:
    assert brl(iof.iof_resgate(Decimal("1000"), 1, IOF)) == Decimal("960.00")
    assert iof.iof_resgate(Decimal("1000"), 30, IOF) == 0


@given(st.integers(min_value=1, max_value=29))
def test_iof_decrescente(d: int) -> None:
    assert iof.iof_aliquota(d, IOF) >= iof.iof_aliquota(d + 1, IOF)


# ------------------------------------------------------- ganho de capital
def test_gc_faixa_unica() -> None:
    assert brl(gc.ir_ganho_capital(Decimal("1000000"), GC)) == Decimal("150000.00")
    assert brl(gc.ir_ganho_capital(Decimal("5000000"), GC)) == Decimal("750000.00")


def test_gc_progressivo_marginal() -> None:
    # 6 mi = 5mi*15% + 1mi*17,5% = 750.000 + 175.000 = 925.000
    assert brl(gc.ir_ganho_capital(Decimal("6000000"), GC)) == Decimal("925000.00")


def test_gc_zero_ou_negativo() -> None:
    assert gc.ir_ganho_capital(Decimal("0"), GC) == 0
    assert gc.ir_ganho_capital(Decimal("-100"), GC) == 0


@given(st.integers(min_value=1, max_value=10**8).map(Decimal))
def test_gc_aliquota_efetiva_na_faixa(g: Decimal) -> None:
    ir = gc.ir_ganho_capital(g, GC)
    assert g * Decimal("0.15") <= ir <= g * Decimal("0.225")


# ------------------------------------------------------------- previdência
def test_prev_aliquota_regressiva() -> None:
    assert prev.aliquota_regressiva(1, PREV) == Decimal("0.35")
    assert prev.aliquota_regressiva(3, PREV) == Decimal("0.30")
    assert prev.aliquota_regressiva(11, PREV) == Decimal("0.10")


def test_prev_base_pgbl_vgbl() -> None:
    assert prev.base_tributavel(Decimal("100000"), Decimal("20000"), "PGBL") == Decimal("120000")
    assert prev.base_tributavel(Decimal("100000"), Decimal("20000"), "VGBL") == Decimal("20000")


def test_prev_ir_regressivo() -> None:
    # PGBL, 11 anos: (100k+20k)*10% = 12.000
    assert brl(prev.ir_previdencia_regressivo(
        Decimal("100000"), Decimal("20000"), 11, "PGBL", PREV)) == Decimal("12000.00")
    # VGBL, 11 anos: 20k*10% = 2.000
    assert brl(prev.ir_previdencia_regressivo(
        Decimal("100000"), Decimal("20000"), 11, "VGBL", PREV)) == Decimal("2000.00")
    # PGBL, 1 ano: (120k)*35% = 42.000
    assert brl(prev.ir_previdencia_regressivo(
        Decimal("100000"), Decimal("20000"), 1, "PGBL", PREV)) == Decimal("42000.00")
