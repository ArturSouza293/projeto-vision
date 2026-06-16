"""Ganho de capital (bens e direitos) — faixas PROGRESSIVAS marginais.

Cada fatia do ganho é tributada à alíquota da sua faixa (como o IRPF). Puro:
parâmetros injetados (``dados`` do ParamSet ``ganho_capital``). Isenções
específicas (imóvel único, reinvestimento, bens de pequeno valor) ficam na
camada de domínio (que decide se o ganho é tributável antes de chamar aqui).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from core.money import D


def ir_ganho_capital(ganho: Decimal, params: dict[str, Any]) -> Decimal:
    """IR sobre o ganho de capital pelas faixas progressivas (marginal por fatia)."""
    g = D(ganho)
    if g <= 0:
        return D(0)
    imposto = D(0)
    piso = D(0)
    for faixa in params["faixas"]:
        teto = D(faixa["ate"]) if faixa["ate"] is not None else g
        topo = min(g, teto)
        if topo > piso:
            imposto += (topo - piso) * D(faixa["aliquota"])
        piso = teto
        if g <= teto:
            break
    return imposto


def isento_imovel_unico(valor_venda: Decimal, params: dict[str, Any]) -> bool:
    """Isenção do imóvel único: venda ≤ teto (sem outra alienação em 5 anos)."""
    return D(valor_venda) <= D(params["isencoes"]["imovel_unico_ate"])


__all__ = ["ir_ganho_capital", "isento_imovel_unico"]
