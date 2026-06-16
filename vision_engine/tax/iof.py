"""IOF regressivo — resgate de renda fixa/fundos em < 30 dias.

Incide sobre o RENDIMENTO, ANTES do IR. Vetor diário oficial 1..29; 30+ = 0.
Puro: parâmetros injetados (``dados`` do ParamSet ``iof``).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from core.money import D


def iof_aliquota(dias: int, params: dict[str, Any]) -> Decimal:
    """Alíquota de IOF sobre o rendimento para resgate em ``dias`` (≥30 ⇒ 0)."""
    if dias >= 30:
        return D(params["acima_30_dias"])
    d = max(dias, 1)  # "mesmo dia" segue a alíquota de 1 dia
    return D(params["por_dia"][str(d)])


def iof_resgate(rendimento: Decimal, dias: int, params: dict[str, Any]) -> Decimal:
    """IOF devido sobre o rendimento no resgate antecipado."""
    r = D(rendimento)
    return r * iof_aliquota(dias, params) if r > 0 else D(0)


__all__ = ["iof_aliquota", "iof_resgate"]
