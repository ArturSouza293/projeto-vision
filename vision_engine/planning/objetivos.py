"""Objetivos por metas (PDF §4.5) — aporte necessário e VF projetado.

Usa TAXA REAL (moeda constante). i mensal = (1+real_aa)^(1/12) − 1 (C2).
"""

from __future__ import annotations

from decimal import Decimal

from core.money import D
from core.tvm import anual_para_mensal, vf, vf_anuidade


def aporte_necessario_mensal(
    vf_meta: Decimal, vp_atual: Decimal, taxa_real_aa: Decimal, meses: int
) -> Decimal:
    """PMT mensal para atingir a meta (PDF §4.5).

    PMT = (VF_meta − VP_atual·(1+i)^n)·i / [(1+i)^n − 1]. Retorna 0 se a meta já
    está financiada pelo patrimônio atual (falta ≤ 0).
    """
    i = anual_para_mensal(taxa_real_aa)
    fator = (D(1) + i) ** meses
    falta = D(vf_meta) - D(vp_atual) * fator
    if falta <= 0:
        return D(0)
    if i == 0:
        return falta / D(meses)
    return falta * i / (fator - D(1))


def vf_projetado(
    vp_atual: Decimal, aporte_mensal: Decimal, taxa_real_aa: Decimal, meses: int
) -> Decimal:
    """VF do patrimônio atual + dos aportes mensais (taxa real)."""
    i = anual_para_mensal(taxa_real_aa)
    return vf(vp_atual, i, meses) + vf_anuidade(aporte_mensal, i, meses)


def pct_financiado(vf_proj: Decimal, vf_meta: Decimal) -> Decimal:
    """Fração da meta financiada pelo VF projetado (0..1+); 1 se meta ≤ 0."""
    meta = D(vf_meta)
    return D(vf_proj) / meta if meta > 0 else D(1)


__all__ = ["aporte_necessario_mensal", "vf_projetado", "pct_financiado"]
