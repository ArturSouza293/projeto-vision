"""Indexadores BR — CDI/Selic/IPCA e fatores de capitalização.

Funções puras em ``Decimal``. Convenção de renda fixa: dias úteis / base 252
(via ``core.tvm.fator_du``). A LLM jamais informa um índice — ele vem de
``params/`` (macro) e é injetado.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from core.money import D
from core.tvm import fator_du


def cdi_de_selic(selic_aa: Decimal, spread: Decimal = Decimal("0.0010")) -> Decimal:
    """CDI ≈ Selic − ~0,10 p.p. (spread configurável)."""
    return D(selic_aa) - D(spread)


def fator_prefixado(taxa_aa: Decimal, dias_uteis: int) -> Decimal:
    """Fator de capitalização de um prefixado (base 252)."""
    return fator_du(taxa_aa, dias_uteis)


def fator_percentual_cdi(pct_cdi: Decimal, cdi_aa: Decimal, dias_uteis: int) -> Decimal:
    """Fator de um pós-fixado a ``pct_cdi``% do CDI (ex.: 120 ⇒ 1,2·CDI)."""
    taxa_aa = D(cdi_aa) * (D(pct_cdi) / D(100))
    return fator_du(taxa_aa, dias_uteis)


def rendimento_poupanca_mensal(valor: Decimal, params_macro: dict[str, Any]) -> Decimal:
    """Rendimento mensal da poupança pela regra vigente (params macro, + TR≈0)."""
    return D(valor) * D(params_macro["poupanca"]["rendimento_am_atual"])


def coberto_fgc(valor: Decimal, params_macro: dict[str, Any]) -> bool:
    """True se o valor está dentro do limite do FGC por CPF/instituição."""
    return D(valor) <= D(params_macro["fgc"]["limite_por_cpf_instituicao"])


__all__ = [
    "cdi_de_selic",
    "fator_prefixado",
    "fator_percentual_cdi",
    "rendimento_poupanca_mensal",
    "coberto_fgc",
]
