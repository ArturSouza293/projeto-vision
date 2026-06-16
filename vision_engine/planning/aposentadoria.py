"""Aposentadoria (PDF §4.8) — acumulação, patrimônio-alvo, gap, retirada.

Moeda constante (taxa real). Patrimônio-alvo pela taxa de retirada sustentável
(a "regra dos 4%" é referência; o motor recebe a taxa como parâmetro).
"""

from __future__ import annotations

from decimal import Decimal

from core.money import D
from core.tvm import anual_para_mensal, vf, vf_anuidade


def patrimonio_acumulado(
    vp_atual: Decimal, aporte_mensal: Decimal, taxa_real_aa: Decimal, anos: int
) -> Decimal:
    """Patrimônio ao fim da acumulação: VF do atual + VF dos aportes (taxa real)."""
    i = anual_para_mensal(taxa_real_aa)
    n = anos * 12
    return vf(vp_atual, i, n) + vf_anuidade(aporte_mensal, i, n)


def patrimonio_alvo(renda_anual_desejada: Decimal, taxa_retirada_aa: Decimal) -> Decimal:
    """Patrimônio-alvo ≈ renda anual desejada ÷ taxa de retirada sustentável."""
    t = D(taxa_retirada_aa)
    if t <= 0:
        raise ValueError("taxa de retirada deve ser > 0")
    return D(renda_anual_desejada) / t


def renda_sustentavel_mensal(patrimonio: Decimal, taxa_retirada_aa: Decimal) -> Decimal:
    """Renda mensal sustentável = patrimônio · taxa de retirada ÷ 12."""
    return D(patrimonio) * D(taxa_retirada_aa) / D(12)


def gap_previdenciario_mensal(
    renda_desejada_mensal: Decimal, renda_continua_mensal: Decimal
) -> Decimal:
    """Gap a cobrir pela carteira = renda desejada − rendas contínuas (INSS etc.)."""
    return max(D(renda_desejada_mensal) - D(renda_continua_mensal), D(0))


__all__ = [
    "patrimonio_acumulado",
    "patrimonio_alvo",
    "renda_sustentavel_mensal",
    "gap_previdenciario_mensal",
]
