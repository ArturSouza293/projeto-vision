"""Mercado (renda fixa) — golden + líquido de IOF/IR."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from core.money import brl
from market import indexadores as idx
from market import renda_fixa as rf
from params.loader import load_params

IR = load_params("ir_investimentos", date(2026, 6, 1)).dados
IOF = load_params("iof", date(2026, 6, 1)).dados
MACRO = load_params("macro", date(2026, 6, 1)).dados


def test_prefixado_1_ano_252_du() -> None:
    # 12% a.a. em 252 dias úteis = 1 ano: rendimento = 12% de 1000 = 120
    assert brl(rf.rendimento_prefixado(Decimal("1000"), Decimal("0.12"), 252)) == Decimal("120.00")


def test_cdb_120_cdi() -> None:
    # 120% do CDI (14,40%) = 17,28% a.a.; em 252 du -> 172,80 de rendimento
    r = rf.rendimento_cdb_pos(Decimal("1000"), Decimal("120"), Decimal("0.1440"), 252)
    assert brl(r) == Decimal("172.80")


def test_liquido_cdb_acima_720d() -> None:
    # rendimento 1000, 800 dias corridos, CDB: IOF 0 (>30d), IR 15% -> líquido 850
    res = rf.liquido_renda_fixa(Decimal("10000"), Decimal("1000"), 800, "CDB", IR, IOF)
    assert res.iof == 0
    assert brl(res.ir) == Decimal("150.00")
    assert brl(res.rendimento_liquido) == Decimal("850.00")
    assert brl(res.valor_final_liquido) == Decimal("10850.00")


def test_liquido_lci_isento() -> None:
    # LCI: isento de IR (MP1303 caducou). >30d -> sem IOF -> líquido = bruto
    res = rf.liquido_renda_fixa(Decimal("10000"), Decimal("1000"), 400, "LCI", IR, IOF)
    assert res.ir == 0
    assert brl(res.rendimento_liquido) == Decimal("1000.00")


def test_liquido_resgate_curto_iof() -> None:
    # resgate em 10 dias: IOF 66% sobre rendimento, depois IR 22,5% sobre o resto
    res = rf.liquido_renda_fixa(Decimal("10000"), Decimal("1000"), 10, "CDB", IR, IOF)
    assert brl(res.iof) == Decimal("660.00")
    assert brl(res.ir) == Decimal("76.50")  # (1000-660)*22,5%
    assert brl(res.rendimento_liquido) == Decimal("263.50")


def test_cdi_de_selic() -> None:
    assert idx.cdi_de_selic(Decimal("0.1450")) == Decimal("0.1440")


def test_fgc() -> None:
    assert idx.coberto_fgc(Decimal("250000"), MACRO)
    assert not idx.coberto_fgc(Decimal("250001"), MACRO)


def test_poupanca_mensal() -> None:
    assert brl(idx.rendimento_poupanca_mensal(Decimal("10000"), MACRO)) == Decimal("50.00")
