"""Gestão de dívidas (PDF §4.4) — serviço, avalanche × bola de neve.

Priorização por CET (não só taxa nominal). Avalanche = maior custo primeiro
(ótimo financeiro); bola de neve = menor saldo primeiro (ganho comportamental).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from core.money import D


@dataclass(frozen=True)
class Divida:
    """Uma dívida pelo seu custo efetivo (CET a.a.), saldo e parcela mensal."""

    nome: str
    saldo: Decimal
    cet_aa: Decimal
    parcela_mensal: Decimal


def servico_divida_mensal(dividas: list[Divida]) -> Decimal:
    """Soma das parcelas mensais de todas as dívidas."""
    return sum((D(d.parcela_mensal) for d in dividas), D(0))


def priorizar_avalanche(dividas: list[Divida]) -> list[Divida]:
    """Ordena por CET decrescente (quitar a mais cara primeiro)."""
    return sorted(dividas, key=lambda d: D(d.cet_aa), reverse=True)


def priorizar_bola_de_neve(dividas: list[Divida]) -> list[Divida]:
    """Ordena por saldo crescente (quitar a menor primeiro)."""
    return sorted(dividas, key=lambda d: D(d.saldo))


__all__ = [
    "Divida",
    "servico_divida_mensal",
    "priorizar_avalanche",
    "priorizar_bola_de_neve",
]
