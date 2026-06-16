"""Loader de parâmetros — resolução por data_referencia + integridade do PDF."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from core.errors import ParamMissing
from params.loader import available_tipos, load_params


def test_tipos_disponiveis() -> None:
    tipos = available_tipos()
    assert {"macro", "irpf", "ir_investimentos", "iof", "ganho_capital", "previdencia"} <= tipos


def test_irpf_vigente_2026() -> None:
    ps = load_params("irpf", date(2026, 6, 1))
    assert ps.versao == "irpf@2026-01-01"
    faixas = ps.dados["mensal"]["faixas"]
    # 5 faixas; última sem teto; topo 27,5%
    assert len(faixas) == 5
    assert faixas[-1]["ate"] is None
    assert Decimal(faixas[-1]["aliquota"]) == Decimal("0.275")
    # redutor Lei 15.270 — isenção efetiva até 5.000
    assert Decimal(ps.dados["mensal"]["redutor_lei_15270"]["isencao_ate"]) == Decimal("5000.00")


def test_ir_investimentos_regressiva() -> None:
    ps = load_params("ir_investimentos", date(2026, 6, 1))
    reg = ps.dados["renda_fixa_regressiva"]
    assert Decimal(reg[0]["aliquota"]) == Decimal("0.225")  # ≤180d
    assert Decimal(reg[-1]["aliquota"]) == Decimal("0.15")  # >720d
    # MP 1303 caducou: LCI/LCA seguem isentas
    assert "LCI" in ps.dados["isentos_pf"] and "LCA" in ps.dados["isentos_pf"]


def test_iof_vetor_completo() -> None:
    ps = load_params("iof", date(2026, 6, 1))
    por_dia = ps.dados["por_dia"]
    assert Decimal(por_dia["1"]) == Decimal("0.96")
    assert Decimal(por_dia["29"]) == Decimal("0.03")
    assert Decimal(ps.dados["acima_30_dias"]) == Decimal("0.0")
    assert len(por_dia) == 29  # dias 1..29; 30+ = 0


def test_macro_jun_2026() -> None:
    ps = load_params("macro", date(2026, 6, 16))
    assert Decimal(ps.dados["selic_meta_aa"]) == Decimal("0.1450")
    assert Decimal(ps.dados["fgc"]["limite_por_cpf_instituicao"]) == Decimal("250000")


def test_resolve_por_data_anterior_falha() -> None:
    # antes de qualquer vigência de IRPF -> erro ESTRUTURADO (não LookupError cru)
    with pytest.raises(ParamMissing) as exc:
        load_params("irpf", date(1990, 1, 1))
    assert exc.value.codigo == "PARAM_MISSING"
    assert "2026-01-01" in exc.value.detalhe  # nomeia o range disponível


def test_tipo_desconhecido_estruturado() -> None:
    with pytest.raises(ParamMissing) as exc:
        load_params("nao_existe", date(2026, 6, 1))
    assert exc.value.codigo == "PARAM_MISSING"


def test_versao_auditavel() -> None:
    ps = load_params("previdencia", date(2026, 6, 1))
    assert "@" in ps.versao and ps.versao.startswith("previdencia@")
