"""IRPF — imposto de renda da pessoa física (mensal), Lei 15.270/2025.

Puro: recebe os parâmetros injetados (o ``dados`` do ParamSet de tipo ``irpf``)
— nunca lê arquivo. A tabela progressiva nominal e as deduções são dados
verificados (PDF Parte 5.2). O REDUTOR da Lei 15.270 é modelado conforme a
descrição qualitativa do PDF (isenção efetiva ≤ R$5.000; redução decrescente
até R$7.350) — ver ``CALIBRACAO`` abaixo.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from core.errors import OutOfRange
from core.money import D

# ----------------------------------------------------------------------------
# CALIBRAÇÃO PENDENTE (não inventar parâmetro tributário):
# A fórmula EXATA do redutor decrescente na faixa R$5.000,01–7.350 (Lei
# 15.270/2025) precisa ser conferida no texto oficial. O modelo aqui é o mais
# fiel à descrição do PDF e é CONTÍNUO e MONOTÔNICO:
#   - base ≤ isencao (5.000)  -> imposto 0 (isenção efetiva);
#   - isencao < base ≤ fim (7.350) -> redutor declina LINEARMENTE do imposto-de-
#     tabela no piso (5.000) até 0 em 7.350; imposto = max(tabela − redutor, 0);
#   - base > fim -> tabela cheia.
# Os pontos de quebra (5.000 / 7.350) vêm de params. Trocar SÓ a curva do
# redutor quando o coeficiente oficial for confirmado, com golden values.
# ----------------------------------------------------------------------------


def _imposto_tabela(base: Decimal, faixas: list[dict[str, Any]]) -> Decimal:
    """Imposto pela tabela progressiva: max(base·alíquota − deduzir, 0)."""
    for f in faixas:
        teto = D(f["ate"]) if f["ate"] is not None else None
        if teto is None or base <= teto:
            return max(base * D(f["aliquota"]) - D(f["deduzir"]), D(0))
    return D(0)  # inalcançável (última faixa tem ate=None)


def irpf_mensal(base: Decimal, params: dict[str, Any]) -> Decimal:
    """IR mensal devido sobre a ``base`` de cálculo, aplicando o redutor."""
    base = D(base)
    if base < 0:
        raise OutOfRange(f"base de cálculo do IRPF não pode ser negativa (recebido {base})")
    mensal = params["mensal"]
    faixas: list[dict[str, Any]] = mensal["faixas"]
    imposto = _imposto_tabela(base, faixas)

    redutor = mensal.get("redutor_lei_15270")
    if not redutor:
        return imposto

    isencao = D(redutor["isencao_ate"])
    fim = D(redutor["reducao_fim"])
    if base <= isencao:
        return D(0)
    if base <= fim:
        imposto_no_piso = _imposto_tabela(isencao, faixas)
        red = imposto_no_piso * (fim - base) / (fim - isencao)  # piso -> 0 (linear)
        return max(imposto - red, D(0))
    return imposto


def irpf_anual(base_anual: Decimal, params: dict[str, Any]) -> Decimal:
    """Aproximação anual = 12 × IR mensal da base/12 (uniforme).

    A apuração anual real usa a tabela anual e o ajuste na declaração; para
    projeção de planejamento, a aproximação uniforme é suficiente e auditável.
    """
    return irpf_mensal(D(base_anual) / D(12), params) * D(12)


def deducao_dependentes(qtd: int, params: dict[str, Any]) -> Decimal:
    """Dedução mensal por dependentes (modelo completo)."""
    if not isinstance(qtd, int) or isinstance(qtd, bool) or qtd < 0:
        raise OutOfRange(f"quantidade de dependentes deve ser inteiro >= 0 (recebido {qtd!r})")
    return D(params["deducoes"]["dependente_mes"]) * D(qtd)


__all__ = ["irpf_mensal", "irpf_anual", "deducao_dependentes"]
