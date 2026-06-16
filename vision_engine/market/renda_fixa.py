"""Renda fixa BR — rentabilidade bruta e LÍQUIDA (IOF + IR regressivo).

Pricing usa dias ÚTEIS (base 252); a tributação (IOF e IR) usa dias CORRIDOS —
ambos são entradas explícitas (conversão úteis↔corridos exige calendário ANBIMA,
fora deste módulo). Ordem fiscal do PDF: IOF incide ANTES do IR, sobre o
rendimento. Funções puras; parâmetros de IR/IOF injetados.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from core.money import D
from market.indexadores import fator_percentual_cdi, fator_prefixado
from tax.iof import iof_resgate
from tax.ir_investimentos import ir_renda_fixa, is_isento_pf


@dataclass(frozen=True)
class ResultadoRendaFixa:
    """Decomposição bruto → IOF → IR → líquido."""

    valor_inicial: Decimal
    rendimento_bruto: Decimal
    iof: Decimal
    ir: Decimal
    rendimento_liquido: Decimal
    valor_final_liquido: Decimal


def rendimento_prefixado(valor: Decimal, taxa_aa: Decimal, dias_uteis: int) -> Decimal:
    """Rendimento bruto de um prefixado: VP·(fator−1), base 252."""
    return D(valor) * (fator_prefixado(taxa_aa, dias_uteis) - D(1))


def rendimento_cdb_pos(
    valor: Decimal, pct_cdi: Decimal, cdi_aa: Decimal, dias_uteis: int
) -> Decimal:
    """Rendimento bruto de um CDB a ``pct_cdi``% do CDI (base 252)."""
    return D(valor) * (fator_percentual_cdi(pct_cdi, cdi_aa, dias_uteis) - D(1))


def liquido_renda_fixa(
    valor: Decimal,
    rendimento_bruto: Decimal,
    dias_corridos: int,
    produto: str,
    params_ir: dict[str, Any],
    params_iof: dict[str, Any],
) -> ResultadoRendaFixa:
    """Aplica IOF (se < 30 dias) e depois IR (regressivo, salvo isentos PF)."""
    rb = D(rendimento_bruto)
    iof = iof_resgate(rb, dias_corridos, params_iof)
    base_ir = rb - iof
    isento = is_isento_pf(produto, params_ir)
    ir = D(0) if isento else ir_renda_fixa(base_ir, dias_corridos, params_ir)
    liq = rb - iof - ir
    return ResultadoRendaFixa(
        valor_inicial=D(valor),
        rendimento_bruto=rb,
        iof=iof,
        ir=ir,
        rendimento_liquido=liq,
        valor_final_liquido=D(valor) + liq,
    )


__all__ = [
    "ResultadoRendaFixa",
    "rendimento_prefixado",
    "rendimento_cdb_pos",
    "liquido_renda_fixa",
]
