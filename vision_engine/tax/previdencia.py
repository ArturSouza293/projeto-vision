"""Previdência privada (PGBL/VGBL) — tributação no resgate e na acumulação.

Regime REGRESSIVO por prazo de acumulação (35% → 10%) OU PROGRESSIVO (tabela
IRPF, IRRF 15% compensável). PGBL tributa principal + rendimento; VGBL só o
rendimento. Na fase de ACUMULAÇÃO, o PGBL deduz contribuições até 12% da renda
bruta tributável (Lei 11.053/2004). Puro: parâmetros injetados.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from core.errors import OutOfRange
from core.money import D
from tax.irpf import irpf_mensal

TipoPrev = Literal["PGBL", "VGBL"]


def aliquota_regressiva(anos_acumulacao: int, params: dict[str, Any]) -> Decimal:
    """Alíquota do regime regressivo pelo prazo de acumulação (anos)."""
    if not isinstance(anos_acumulacao, int) or isinstance(anos_acumulacao, bool):
        raise OutOfRange(f"anos_acumulacao deve ser inteiro (recebido {anos_acumulacao!r})")
    if anos_acumulacao < 0:
        raise OutOfRange(f"anos_acumulacao não pode ser negativo (recebido {anos_acumulacao})")
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
    raise OutOfRange("tipo deve ser 'PGBL' ou 'VGBL'")


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


def irrf_fonte_progressivo(beneficio_mensal: Decimal, params: dict[str, Any]) -> Decimal:
    """IRRF retido na fonte no regime PROGRESSIVO (15%, compensável na declaração)."""
    b = D(beneficio_mensal)
    if b <= 0:
        return D(0)
    return b * D(params["progressivo"]["irrf_fonte_pct"])


def ir_previdencia_progressivo(
    beneficio_mensal: Decimal, params_irpf: dict[str, Any]
) -> Decimal:
    """IR no regime PROGRESSIVO: o benefício é tributado pela tabela IRPF mensal.

    Reusa o motor de IRPF (``params_irpf`` injetado). O IRRF de 15% retido na
    fonte (:func:`irrf_fonte_progressivo`) é compensável na declaração anual.
    """
    return irpf_mensal(beneficio_mensal, params_irpf)


def base_deduzivel_pgbl(
    contribuicao_ano: Decimal, renda_bruta_tributavel_ano: Decimal, params: dict[str, Any]
) -> Decimal:
    """Parcela do PGBL dedutível da base do IRPF no ano (Lei 11.053/2004).

    Dedutível = min(contribuição, 12% · renda bruta tributável). É o diferencial
    econômico do PGBL na ACUMULAÇÃO (o VGBL não tem). A economia de imposto é
    essa base × a alíquota marginal do contribuinte (calculada via tax/irpf).
    """
    contrib = D(contribuicao_ano)
    renda = D(renda_bruta_tributavel_ano)
    if contrib < 0 or renda < 0:
        raise OutOfRange("contribuição e renda bruta tributável devem ser >= 0")
    teto = renda * D(params["pgbl_vgbl"]["pgbl_deducao_pct"])
    return min(contrib, teto)


__all__ = [
    "TipoPrev",
    "aliquota_regressiva",
    "base_tributavel",
    "ir_previdencia_regressivo",
    "irrf_fonte_progressivo",
    "ir_previdencia_progressivo",
    "base_deduzivel_pgbl",
]
