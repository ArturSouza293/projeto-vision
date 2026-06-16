"""Previdência privada (PGBL/VGBL) — tributação no resgate.

Regime REGRESSIVO por prazo de acumulação (35% → 10%) OU progressivo (tabela
IRPF, IRRF 15% compensável). PGBL tributa principal + rendimento; VGBL só o
rendimento. Puro: parâmetros injetados (``dados`` do ParamSet ``previdencia``).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from core.money import D

TipoPrev = Literal["PGBL", "VGBL"]


def aliquota_regressiva(anos_acumulacao: int, params: dict[str, Any]) -> Decimal:
    """Alíquota do regime regressivo pelo prazo de acumulação (anos)."""
    for faixa in params["regressivo"]:
        ate = faixa["ate_anos"]
        if ate is None or anos_acumulacao <= int(ate):
            return D(faixa["aliquota"])
    return D(params["regressivo"][-1]["aliquota"])


def base_tributavel(principal: Decimal, rendimento: Decimal, tipo: TipoPrev) -> Decimal:
    """Base do IR no resgate: PGBL = principal + rendimento; VGBL = rendimento."""
    if tipo == "PGBL":
        return D(principal) + D(rendimento)
    if tipo == "VGBL":
        return D(rendimento)
    raise ValueError("tipo deve ser 'PGBL' ou 'VGBL'")


def ir_previdencia_regressivo(
    principal: Decimal,
    rendimento: Decimal,
    anos_acumulacao: int,
    tipo: TipoPrev,
    params: dict[str, Any],
) -> Decimal:
    """IR no resgate pelo regime regressivo, conforme PGBL/VGBL."""
    base = base_tributavel(principal, rendimento, tipo)
    if base <= 0:
        return D(0)
    return base * aliquota_regressiva(anos_acumulacao, params)


__all__ = [
    "TipoPrev",
    "aliquota_regressiva",
    "base_tributavel",
    "ir_previdencia_regressivo",
]
