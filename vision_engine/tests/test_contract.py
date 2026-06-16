"""Contrato motor ↔ LLM — registry, envelopes auditáveis, erros estruturados."""

from __future__ import annotations

from decimal import Decimal

import pytest

from contract import call_tool, list_tools, tool_schemas
from contract.errors import OutOfRange, ToolNotFound
from contract.models import ResultEnvelope

REF = "2026-06-01"


def test_registry_populado() -> None:
    nomes = {t["name"] for t in list_tools()}
    esperadas = {"irpf_mensal", "ir_renda_fixa", "ganho_capital", "cdb_liquido", "aporte_objetivo"}
    assert esperadas <= nomes


def test_ir_renda_fixa_tool() -> None:
    # taxado: rendimento 1000 em 100 dias -> 22,5% = 225
    env = call_tool(
        "ir_renda_fixa",
        {"rendimento": "1000", "dias_corridos": 100, "produto": "CDB", "data_referencia": REF},
    )
    assert env.valor == Decimal("225.00")
    # isento: LCI -> IR 0
    env_lci = call_tool(
        "ir_renda_fixa",
        {"rendimento": "1000", "dias_corridos": 100, "produto": "LCI", "data_referencia": REF},
    )
    assert env_lci.valor == 0
    assert "isento" in env_lci.formula


def test_json_schemas() -> None:
    sc = tool_schemas()
    assert sc["irpf_mensal"]["type"] == "object"
    assert "base" in sc["irpf_mensal"]["properties"]


def test_irpf_envelope_auditavel() -> None:
    env = call_tool("irpf_mensal", {"base": "10000", "data_referencia": REF})
    assert isinstance(env, ResultEnvelope)
    assert env.valor == Decimal("1841.27")
    assert env.unidade == "BRL"
    assert env.parametros_versao == "irpf@2026-01-01"
    assert env.formula  # auditoria presente


def test_cdb_liquido_detalhe() -> None:
    env = call_tool(
        "cdb_liquido",
        {
            "valor": "10000",
            "pct_cdi": "120",
            "prazo_dias_uteis": 252,
            "prazo_dias_corridos": 800,
            "data_referencia": REF,
        },
    )
    # bruto 120%·14,40% em 252du = 1728,00; >720d IR 15% -> líquido 1468,80
    assert env.valor == Decimal("1468.80")
    assert env.detalhe is not None
    assert env.detalhe["rendimento_bruto"] == "1728.00"
    assert ";" in (env.parametros_versao or "")  # macro;ir;iof


def test_ganho_capital_envelope() -> None:
    env = call_tool("ganho_capital", {"ganho": "6000000", "data_referencia": REF})
    assert env.valor == Decimal("925000.00")


def test_aporte_objetivo_envelope() -> None:
    env = call_tool(
        "aporte_objetivo",
        {"vf_meta": "100000", "vp_atual": "0", "taxa_real_aa": "0", "meses": 100},
    )
    assert env.valor == Decimal("1000.00")
    assert env.unidade == "BRL/mês"


def test_ferramenta_inexistente() -> None:
    with pytest.raises(ToolNotFound):
        call_tool("nao_existe", {})


def test_validacao_vira_out_of_range() -> None:
    # base deve ser > 0 -> ValidationError -> OUT_OF_RANGE estruturado
    with pytest.raises(OutOfRange):
        call_tool("irpf_mensal", {"base": "-100", "data_referencia": REF})


def test_extra_forbidden() -> None:
    with pytest.raises(OutOfRange):
        call_tool("irpf_mensal", {"base": "5000", "data_referencia": REF, "campo_extra": 1})
