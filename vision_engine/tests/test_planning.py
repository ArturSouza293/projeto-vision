"""Planejamento (PDF §4) — golden por módulo."""

from __future__ import annotations

from decimal import Decimal

from core.money import brl
from planning import (
    alocacao,
    aposentadoria,
    dividas,
    indicadores,
    objetivos,
    reserva,
    seguros,
)


# ---------------------------------------------------------------- objetivos
def test_aporte_necessario_taxa_zero() -> None:
    assert brl(objetivos.aporte_necessario_mensal(
        Decimal("100000"), Decimal("0"), Decimal("0"), 100)) == Decimal("1000.00")


def test_aporte_zero_se_ja_financiado() -> None:
    assert objetivos.aporte_necessario_mensal(
        Decimal("100000"), Decimal("100000"), Decimal("0.05"), 120) == 0


def test_vf_projetado_e_pct() -> None:
    vfp = objetivos.vf_projetado(Decimal("0"), Decimal("1000"), Decimal("0"), 100)
    assert brl(vfp) == Decimal("100000.00")
    assert objetivos.pct_financiado(Decimal("50000"), Decimal("100000")) == Decimal("0.5")


# ------------------------------------------------------------- aposentadoria
def test_acumulacao_taxa_zero() -> None:
    assert brl(aposentadoria.patrimonio_acumulado(
        Decimal("0"), Decimal("1000"), Decimal("0"), 10)) == Decimal("120000.00")


def test_patrimonio_alvo_e_renda() -> None:
    assert aposentadoria.patrimonio_alvo(Decimal("120000"), Decimal("0.04")) == Decimal("3000000")
    assert brl(aposentadoria.renda_sustentavel_mensal(
        Decimal("3000000"), Decimal("0.04"))) == Decimal("10000.00")


def test_gap_previdenciario() -> None:
    gap = aposentadoria.gap_previdenciario_mensal(Decimal("10000"), Decimal("8000"))
    assert gap == Decimal("2000")


# ---------------------------------------------------------------- reserva
def test_reserva() -> None:
    assert reserva.meses_recomendados("estavel") == (3, 6)
    assert reserva.meses_recomendados("instavel") == (6, 12)
    assert reserva.alvo_reserva(Decimal("5000"), 6) == Decimal("30000")
    assert reserva.gap_reserva(Decimal("30000"), Decimal("10000")) == Decimal("20000")
    assert reserva.gap_reserva(Decimal("30000"), Decimal("40000")) == 0


# ---------------------------------------------------------------- dívidas
def test_dividas_prioritizacao() -> None:
    d = [
        dividas.Divida("cartao", Decimal("5000"), Decimal("3.50"), Decimal("500")),
        dividas.Divida("consignado", Decimal("20000"), Decimal("0.25"), Decimal("400")),
    ]
    assert dividas.servico_divida_mensal(d) == Decimal("900")
    assert dividas.priorizar_avalanche(d)[0].nome == "cartao"  # maior CET
    assert dividas.priorizar_bola_de_neve(d)[0].nome == "cartao"  # menor saldo


# ---------------------------------------------------------------- seguros
def test_seguros() -> None:
    assert seguros.capital_segurado_necessario(
        Decimal("200000"), Decimal("300000"), Decimal("100000")) == Decimal("400000")
    assert seguros.capital_segurado_necessario(
        Decimal("100000"), Decimal("50000"), Decimal("200000")) == 0
    assert seguros.indice_cobertura(Decimal("200000"), Decimal("400000")) == Decimal("0.5")


# ---------------------------------------------------------------- indicadores
def test_indicadores() -> None:
    assert indicadores.patrimonio_liquido(Decimal("500000"), Decimal("200000")) == Decimal("300000")
    assert indicadores.sobra_mensal(Decimal("10000"), Decimal("7000")) == Decimal("3000")
    assert indicadores.taxa_poupanca(Decimal("3000"), Decimal("10000")) == Decimal("0.3")
    assert indicadores.alerta_endividamento(Decimal("3500"), Decimal("10000")) is True
    assert indicadores.alerta_endividamento(Decimal("2000"), Decimal("10000")) is False
    assert indicadores.liquidez_meses(Decimal("30000"), Decimal("5000")) == Decimal("6")


# ---------------------------------------------------------------- alocação
def test_alocacao() -> None:
    assert alocacao.alocacao_alvo("moderado")["renda_fixa"] == Decimal("0.55")
    for perfil in ("conservador", "moderado", "arrojado"):
        total = sum(alocacao.ALOCACAO_ALVO[perfil].values(), Decimal(0))  # type: ignore[arg-type]
        assert total == Decimal("1.00")
    dv = alocacao.desvio_rebalanceamento({"renda_fixa": Decimal("0.70")}, "moderado")
    assert dv["renda_fixa"] == Decimal("0.15")
