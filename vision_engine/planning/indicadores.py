"""Indicadores de diagnóstico financeiro (PDF §4.2). Funções puras em Decimal."""

from __future__ import annotations

from decimal import Decimal

from core.money import D

ALERTA_COMPROMETIMENTO = D("0.30")  # parcelas/renda > 30% = alerta (PDF §4.2)


def patrimonio_liquido(ativos: Decimal, passivos: Decimal) -> Decimal:
    """Ativos − Passivos."""
    return D(ativos) - D(passivos)


def sobra_mensal(receitas: Decimal, despesas: Decimal) -> Decimal:
    """Receitas − Despesas (capacidade de poupança)."""
    return D(receitas) - D(despesas)


def taxa_poupanca(sobra: Decimal, receita_liquida: Decimal) -> Decimal:
    """Sobra ÷ receita líquida (meta saudável ≥ 10–20%). 0 se receita ≤ 0."""
    rl = D(receita_liquida)
    return D(sobra) / rl if rl > 0 else D(0)


def comprometimento_renda(parcelas: Decimal, renda: Decimal) -> Decimal:
    """Parcelas de dívida ÷ renda (alerta > 30%)."""
    r = D(renda)
    return D(parcelas) / r if r > 0 else D(0)


def alerta_endividamento(parcelas: Decimal, renda: Decimal) -> bool:
    """True se o comprometimento de renda passa do limite de alerta."""
    return comprometimento_renda(parcelas, renda) > ALERTA_COMPROMETIMENTO


def liquidez_meses(ativos_liquidos: Decimal, despesas_mensais: Decimal) -> Decimal:
    """Ativos líquidos ÷ despesas mensais (cobre quantos meses)."""
    d = D(despesas_mensais)
    return D(ativos_liquidos) / d if d > 0 else D(0)


__all__ = [
    "ALERTA_COMPROMETIMENTO",
    "patrimonio_liquido",
    "sobra_mensal",
    "taxa_poupanca",
    "comprometimento_renda",
    "alerta_endividamento",
    "liquidez_meses",
]
