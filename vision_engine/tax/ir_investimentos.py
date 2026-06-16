"""IR sobre investimentos — regra VIGENTE (MP 1303 caducou: regra anterior).

Puro: parâmetros injetados (``dados`` do ParamSet ``ir_investimentos``). Tudo
sobre o RENDIMENTO/ganho, em ``Decimal``. Rendimento ≤ 0 ⇒ IR 0.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from core.errors import OutOfRange
from core.money import D

ClasseProduto = Literal["isento", "tributavel"]


def classificar_produto(produto: str, params: dict[str, Any]) -> ClasseProduto:
    """Classifica o produto de renda fixa: ``"isento"`` ou ``"tributavel"``.

    Tri-estado em vez de binário: produto DESCONHECIDO (typo, vazio, fora das
    listas) vira ``OutOfRange`` em vez de ser tributado em silêncio. Comparação
    normalizada (``strip().upper()``) tolera espaços e caixa. Isentos e
    tributáveis vêm do YAML (param-driven, auditável).
    """
    nome = produto.strip().upper()
    isentos = {str(p).strip().upper() for p in params.get("isentos_pf", [])}
    tributaveis = {str(p).strip().upper() for p in params.get("tributaveis_pf", [])}
    if nome in isentos:
        return "isento"
    if nome in tributaveis:
        return "tributavel"
    raise OutOfRange(
        f"produto de renda fixa desconhecido: {produto!r} — informe um produto "
        f"isento ({sorted(isentos)}) ou tributável ({sorted(tributaveis)})"
    )


def aliquota_renda_fixa(dias_corridos: int, params: dict[str, Any]) -> Decimal:
    """Alíquota regressiva da renda fixa/Tesouro por prazo (dias corridos)."""
    for faixa in params["renda_fixa_regressiva"]:
        ate = faixa["ate_dias"]
        if ate is None or dias_corridos <= int(ate):
            return D(faixa["aliquota"])
    return D(params["renda_fixa_regressiva"][-1]["aliquota"])


def ir_renda_fixa(rendimento: Decimal, dias_corridos: int, params: dict[str, Any]) -> Decimal:
    """IR sobre o rendimento de renda fixa (tabela regressiva)."""
    r = D(rendimento)
    if r <= 0:
        return D(0)
    return r * aliquota_renda_fixa(dias_corridos, params)


def is_isento_pf(produto: str, params: dict[str, Any]) -> bool:
    """True se o produto é isento de IR para PF (LCI/LCA/CRI/CRA/…)."""
    return produto.upper() in {str(p).upper() for p in params["isentos_pf"]}


def aliquota_come_cotas(longo_prazo: bool, params: dict[str, Any]) -> Decimal:
    """Alíquota do come-cotas (antecipação semestral): 15% LP / 20% CP."""
    cc = params["fundos_come_cotas"]
    return D(cc["longo_prazo_pct"] if longo_prazo else cc["curto_prazo_pct"])


def ir_fii_ganho_venda(ganho: Decimal, params: dict[str, Any]) -> Decimal:
    """IR sobre ganho na venda de cotas de FII (20%, sem isenção por valor)."""
    g = D(ganho)
    return g * D(params["fii"]["ganho_venda_pct"]) if g > 0 else D(0)


def ir_acoes_swing(
    ganho_mensal: Decimal, vendas_no_mes: Decimal, params: dict[str, Any]
) -> Decimal:
    """IR swing trade: 15% sobre o ganho; isento se vendas do mês ≤ teto."""
    g = D(ganho_mensal)
    if g <= 0:
        return D(0)
    if D(vendas_no_mes) <= D(params["acoes"]["isencao_vendas_mes"]):
        return D(0)
    return g * D(params["acoes"]["swing_pct"])


def ir_acoes_day_trade(ganho_mensal: Decimal, params: dict[str, Any]) -> Decimal:
    """IR day trade: 20% sobre o ganho (sem isenção por valor)."""
    g = D(ganho_mensal)
    return g * D(params["acoes"]["day_trade_pct"]) if g > 0 else D(0)


def ir_jcp(valor: Decimal, params: dict[str, Any]) -> Decimal:
    """IRRF sobre juros sobre capital próprio (15% na fonte)."""
    v = D(valor)
    return v * D(params["jcp_irrf_pct"]) if v > 0 else D(0)


def ir_exterior(rendimento: Decimal, params: dict[str, Any]) -> Decimal:
    """IR sobre rendimentos no exterior (Lei 14.754): 15% anual."""
    r = D(rendimento)
    return r * D(params["exterior_lei_14754_pct"]) if r > 0 else D(0)


__all__ = [
    "aliquota_renda_fixa",
    "ir_renda_fixa",
    "is_isento_pf",
    "aliquota_come_cotas",
    "ir_fii_ganho_venda",
    "ir_acoes_swing",
    "ir_acoes_day_trade",
    "ir_jcp",
    "ir_exterior",
]
