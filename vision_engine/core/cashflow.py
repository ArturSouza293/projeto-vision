"""Fluxos de caixa — VPL, TIR (bisseção), TIR modificada e payback.

Funções puras em ``Decimal``. Convenção: ``fluxos`` é a lista do período 0..n,
onde ``fluxos[0]`` costuma ser o investimento inicial (negativo) e os demais as
entradas. Datas implícitas em períodos inteiros e uniformes.
"""

from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal

from core.errors import OutOfRange
from core.money import D, Number


def npv(taxa: Number, fluxos: Sequence[Number]) -> Decimal:
    """Valor presente líquido: Σ FC_t/(1+i)^t (t a partir de 0)."""
    i = D(taxa)
    total = D(0)
    for t, fc in enumerate(fluxos):
        total += D(fc) / (D(1) + i) ** t
    return total


def irr(
    fluxos: Sequence[Number],
    *,
    lo: Number = "-0.999999",
    hi: Number = "1",
    tol: Number = "1e-14",
    max_iter: int = 500,
) -> Decimal:
    """TIR por bisseção (i tal que VPL(i) = 0).

    A borda superior do bracket é EXPANDIDA (×10) até haver mudança de sinal —
    cobre qualquer TIR de fluxo convencional sem um teto arbitrário. Para fluxos
    não-convencionais (múltiplas TIRs), use :func:`mtir`.
    """
    vals = [D(f) for f in fluxos]
    if len(vals) < 2:
        raise OutOfRange("irr requer ao menos 2 fluxos")
    if not (any(v > 0 for v in vals) and any(v < 0 for v in vals)):
        # sem entrada E saída não existe TIR — não fabricar um número
        raise OutOfRange("irr requer fluxos com sinais opostos (ao menos uma entrada e uma saída)")
    a, b = D(lo), D(hi)
    fa, fb = npv(a, fluxos), npv(b, fluxos)
    if fa == 0:
        return a
    expand = 0
    while fa * fb > 0 and expand < 80:
        if fb == 0:
            return b
        b *= D(10)
        fb = npv(b, fluxos)
        expand += 1
    if fb == 0:
        return b
    if fa * fb > 0:
        raise OutOfRange(
            "TIR fora do bracket pesquisado (TIR < −99,9999% ou fluxo "
            "não-convencional com múltiplas raízes) — use mtir()"
        )
    tol_d = D(tol)
    mid = (a + b) / D(2)
    for _ in range(max_iter):
        mid = (a + b) / D(2)
        fm = npv(mid, fluxos)
        if fm == 0 or (b - a) / D(2) < tol_d:
            return mid
        if fa * fm < 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return mid


def mtir(
    fluxos: Sequence[Number],
    taxa_financiamento: Number,
    taxa_reinvestimento: Number,
) -> Decimal:
    """TIR modificada (MTIR).

    Entradas reinvestidas até o fim à ``taxa_reinvestimento``; saídas trazidas a
    valor presente à ``taxa_financiamento``. Robusta a fluxos não-convencionais.
    """
    fin, rei = D(taxa_financiamento), D(taxa_reinvestimento)
    n = len(fluxos) - 1
    if n <= 0:
        raise OutOfRange("fluxos insuficientes para MTIR (mínimo 2)")
    vf_positivos = D(0)
    vp_negativos = D(0)
    for t, fc in enumerate(fluxos):
        fc_d = D(fc)
        if fc_d > 0:
            vf_positivos += fc_d * (D(1) + rei) ** (n - t)
        elif fc_d < 0:
            vp_negativos += fc_d / (D(1) + fin) ** t
    if vp_negativos == 0:
        raise OutOfRange("sem saídas para financiar — MTIR indefinida")
    if vf_positivos == 0:
        # guard simétrico: sem entradas não há retorno a medir (evitava −100% falso)
        raise OutOfRange("sem entradas — MTIR indefinida")
    return (vf_positivos / -vp_negativos) ** (D(1) / D(n)) - D(1)


def payback_simples(fluxos: Sequence[Number]) -> Decimal | None:
    """Período (com fração linear) em que o caixa acumulado vira ≥ 0; None se nunca."""
    acumulado = D(0)
    for t, fc in enumerate(fluxos):
        anterior = acumulado
        acumulado += D(fc)
        if acumulado >= 0 and t > 0 and anterior < 0:
            falta = -anterior
            return D(t - 1) + falta / D(fc)
    return None


def payback_descontado(fluxos: Sequence[Number], taxa: Number) -> Decimal | None:
    """Como :func:`payback_simples`, mas descontando os fluxos pela ``taxa``."""
    i = D(taxa)
    descontados = [D(fc) / (D(1) + i) ** t for t, fc in enumerate(fluxos)]
    return payback_simples(descontados)


__all__ = ["npv", "irr", "mtir", "payback_simples", "payback_descontado"]
