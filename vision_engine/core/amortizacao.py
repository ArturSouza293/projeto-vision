"""Sistemas de amortização — tabela completa por período, em ``Decimal``.

PRICE (prestação constante), SAC (amortização constante) e Americano (juros
periódicos + principal no fim). A taxa ``i`` é EFETIVA por período (ex.: mensal).
CET (Custo Efetivo Total, com tarifas/seguros/tributos) fica para a camada de
domínio (``planning/dividas``) — aqui são "juros efetivos, sem CET".

SACRE/misto (reajuste por TR) depende de parâmetro datado e fica para fase
posterior (precisa do índice de reajuste).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from core.errors import OutOfRange
from core.money import D, Number, require_int, require_taxa
from core.tvm import pmt_de_vp


@dataclass(frozen=True)
class Parcela:
    """Uma linha da tabela de amortização."""

    n: int
    saldo_inicial: Decimal
    juros: Decimal
    amortizacao: Decimal
    prestacao: Decimal
    saldo_final: Decimal


def _valida_emprestimo(principal: Number, i: Number, n: int) -> tuple[Decimal, Decimal]:
    """Guardas comuns aos três sistemas: principal > 0, n inteiro ≥ 1, 1 + i > 0.

    Sem isso, ``n=0`` dava ``DivisionByZero`` cru (Price/SAC) ou tabela vazia
    silenciosa (Americano), e principal/​taxa absurdos passavam sem rejeição.
    """
    require_int(n, minimo=1, nome="n")
    p = D(principal)
    if p <= 0:
        raise OutOfRange(f"principal deve ser > 0 (recebido {p})")
    return p, require_taxa(i)


def price(principal: Number, i: Number, n: int) -> list[Parcela]:
    """Sistema PRICE: prestação constante, amortização crescente."""
    _, i_d = _valida_emprestimo(principal, i, n)
    pmt = pmt_de_vp(principal, i_d, n)
    saldo = D(principal)
    out: list[Parcela] = []
    for k in range(1, n + 1):
        juros = saldo * i_d
        # Última parcela: zera o saldo (absorve resíduo de arredondamento da taxa).
        amort = saldo if k == n else pmt - juros
        # prestação = juros + amortização (identidade exata por construção; ≈ pmt).
        prest = juros + amort
        saldo_f = saldo - amort
        out.append(Parcela(k, saldo, juros, amort, prest, saldo_f))
        saldo = saldo_f
    return out


def sac(principal: Number, i: Number, n: int) -> list[Parcela]:
    """Sistema SAC: amortização constante, prestação decrescente."""
    p, i_d = _valida_emprestimo(principal, i, n)
    amort = p / D(n)
    saldo = D(principal)
    out: list[Parcela] = []
    for k in range(1, n + 1):
        juros = saldo * i_d
        amort_k = saldo if k == n else amort  # última zera o saldo
        prest = amort_k + juros
        saldo_f = saldo - amort_k
        out.append(Parcela(k, saldo, juros, amort_k, prest, saldo_f))
        saldo = saldo_f
    return out


def americano(principal: Number, i: Number, n: int) -> list[Parcela]:
    """Sistema Americano: só juros a cada período; principal (bullet) no fim."""
    saldo, i_d = _valida_emprestimo(principal, i, n)
    out: list[Parcela] = []
    for k in range(1, n + 1):
        juros = saldo * i_d
        amort = saldo if k == n else D(0)
        prest = juros + amort
        saldo_f = saldo - amort
        out.append(Parcela(k, saldo, juros, amort, prest, saldo_f))
        saldo = saldo_f
    return out


def total_juros(tabela: list[Parcela]) -> Decimal:
    """Soma dos juros de toda a tabela."""
    return sum((p.juros for p in tabela), D(0))


__all__ = ["Parcela", "price", "sac", "americano", "total_juros"]
