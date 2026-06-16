"""Reserva de emergência (PDF §4.3) — dimensionamento por estabilidade de renda."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from core.money import D

Estabilidade = Literal["estavel", "instavel"]


def meses_recomendados(estabilidade: Estabilidade) -> tuple[int, int]:
    """Faixa de meses de despesas essenciais: CLT estável 3–6; autônomo 6–12."""
    return (3, 6) if estabilidade == "estavel" else (6, 12)


def alvo_reserva(despesas_essenciais_mensais: Decimal, meses: int) -> Decimal:
    """Alvo da reserva = despesas essenciais × nº de meses."""
    return D(despesas_essenciais_mensais) * D(meses)


def gap_reserva(alvo: Decimal, atual: Decimal) -> Decimal:
    """Quanto falta para a reserva (≥ 0)."""
    return max(D(alvo) - D(atual), D(0))


__all__ = ["Estabilidade", "meses_recomendados", "alvo_reserva", "gap_reserva"]
