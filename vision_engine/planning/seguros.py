"""Proteção/seguros (PDF §4.9) — necessidade de capital segurado."""

from __future__ import annotations

from decimal import Decimal

from core.money import D


def capital_segurado_necessario(
    dividas_a_quitar: Decimal,
    reserva_para_dependentes: Decimal,
    ativos_liquidos: Decimal,
) -> Decimal:
    """Método da necessidade da família (≥ 0).

    Necessidade = dívidas a quitar + reserva para dependentes − ativos líquidos
    já disponíveis. Cobre morte/invalidez (o excedente de ativos zera a falta).
    """
    return max(
        D(dividas_a_quitar) + D(reserva_para_dependentes) - D(ativos_liquidos),
        D(0),
    )


def indice_cobertura(capital_segurado: Decimal, necessidade: Decimal) -> Decimal:
    """Capital segurado ÷ necessidade de proteção (1.0 = totalmente coberto)."""
    n = D(necessidade)
    return D(capital_segurado) / n if n > 0 else D(1)


__all__ = ["capital_segurado_necessario", "indice_cobertura"]
