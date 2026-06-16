"""Valor do dinheiro no tempo (VDT) — funções puras em ``Decimal``.

Cobre: juros compostos (VF/VP), conversão de taxas equivalentes (composta),
Fisher exato (taxa real ↔ nominal), fator base 252 (renda fixa BR), séries
uniformes (anuidades postecipadas/antecipadas), anuidades crescentes (growing,
inclusive o caso degenerado g = i) e perpetuidades. Sem I/O, sem data/relógio.

Convenções (alinhadas ao motor TS existente, âncoras HP-12C):
- Taxas EFETIVAS compostas: i_m = (1+i_aa)^(1/12) − 1 (nunca i_aa/12).
- Fisher EXATO: real = (1+nom)/(1+inf) − 1 (nunca subtração).
- Timing "end" (postecipado, default HP-12C) ou "begin" (antecipado).

Validação (V2): prazos são inteiros ≥ 0 (≥ 1 onde dividem); taxas exigem
``1 + i > 0``. Entradas fora disso viram ``OutOfRange`` estruturado — nunca
``DivisionByZero``/``InvalidOperation`` crus (que vazariam como 500 opaco).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from core.errors import OutOfRange
from core.money import D, Number, require_int, require_taxa

Timing = Literal["end", "begin"]


# --------------------------------------------------------------- juros compostos
def vf(vp: Number, i: Number, n: int) -> Decimal:
    """Valor futuro com juros compostos: VF = VP·(1+i)^n."""
    require_int(n, minimo=0, nome="n")
    return D(vp) * (D(1) + require_taxa(i)) ** n


def vp(vf: Number, i: Number, n: int) -> Decimal:
    """Valor presente: VP = VF/(1+i)^n."""
    require_int(n, minimo=0, nome="n")
    return D(vf) / (D(1) + require_taxa(i)) ** n


def vf_simples(vp: Number, i: Number, n: int) -> Decimal:
    """Valor futuro a juros SIMPLES: VF = VP·(1 + i·n) (uso pontual: mora/desconto)."""
    require_int(n, minimo=0, nome="n")
    return D(vp) * (D(1) + D(i) * D(n))


# ------------------------------------------------------------------ taxas / Fisher
def taxa_equivalente(i: Number, de_periodos: int, para_periodos: int) -> Decimal:
    """Converte taxa entre períodos sob capitalização composta.

    ``de_periodos``/``para_periodos`` = quantidade de períodos no ano de cada
    base. Ex.: anual→mensal => ``taxa_equivalente(i_aa, 1, 12)``.
    """
    require_int(de_periodos, minimo=1, nome="de_periodos")
    require_int(para_periodos, minimo=1, nome="para_periodos")
    base = D(1) + require_taxa(i)
    return base ** (D(de_periodos) / D(para_periodos)) - D(1)


def anual_para_mensal(i_aa: Number) -> Decimal:
    """i_m = (1+i_aa)^(1/12) − 1."""
    return (D(1) + require_taxa(i_aa, nome="i_aa")) ** (D(1) / D(12)) - D(1)


def mensal_para_anual(i_am: Number) -> Decimal:
    """i_aa = (1+i_am)^12 − 1."""
    return (D(1) + require_taxa(i_am, nome="i_am")) ** 12 - D(1)


def taxa_real(i_nominal: Number, inflacao: Number) -> Decimal:
    """Fisher EXATO: real = (1+nom)/(1+inf) − 1. Requer inflação > −1."""
    return (D(1) + D(i_nominal)) / (D(1) + require_taxa(inflacao, nome="inflacao")) - D(1)


def taxa_nominal(i_real: Number, inflacao: Number) -> Decimal:
    """Fisher inverso: nom = (1+real)·(1+inf) − 1. Requer inflação > −1."""
    return (D(1) + D(i_real)) * (D(1) + require_taxa(inflacao, nome="inflacao")) - D(1)


def fator_du(i_aa: Number, dias_uteis: int) -> Decimal:
    """Fator de capitalização base 252 (renda fixa BR): (1+i_aa)^(du/252)."""
    require_int(dias_uteis, minimo=0, nome="dias_uteis")
    return (D(1) + require_taxa(i_aa, nome="i_aa")) ** (D(dias_uteis) / D(252))


# ------------------------------------------------------------- séries uniformes
def vp_anuidade(pmt: Number, i: Number, n: int, timing: Timing = "end") -> Decimal:
    """VP de série uniforme. i=0 => VP = PMT·n (limite). 'begin' multiplica (1+i)."""
    require_int(n, minimo=0, nome="n")
    i_d, pmt_d = require_taxa(i), D(pmt)
    vp_val = pmt_d * D(n) if i_d == 0 else pmt_d * (D(1) - (D(1) + i_d) ** (-n)) / i_d
    return vp_val * (D(1) + i_d) if timing == "begin" else vp_val


def vf_anuidade(pmt: Number, i: Number, n: int, timing: Timing = "end") -> Decimal:
    """VF de série uniforme. i=0 => VF = PMT·n. 'begin' multiplica (1+i)."""
    require_int(n, minimo=0, nome="n")
    i_d, pmt_d = require_taxa(i), D(pmt)
    vf_val = pmt_d * D(n) if i_d == 0 else pmt_d * ((D(1) + i_d) ** n - D(1)) / i_d
    return vf_val * (D(1) + i_d) if timing == "begin" else vf_val


def pmt_de_vp(vp: Number, i: Number, n: int, timing: Timing = "end") -> Decimal:
    """PMT que amortiza um VP em n períodos (base do Price)."""
    require_int(n, minimo=1, nome="n")
    i_d, vp_d = require_taxa(i), D(vp)
    pmt_val = vp_d / D(n) if i_d == 0 else vp_d * i_d / (D(1) - (D(1) + i_d) ** (-n))
    return pmt_val / (D(1) + i_d) if timing == "begin" else pmt_val


# ------------------------------------------------------ anuidades crescentes
def pv_growing_annuity(pmt: Number, i: Number, g: Number, n: int) -> Decimal:
    """VP de série que cresce a ``g`` por período.

    Caso degenerado g = i: VP = n·PMT/(1+i) (evita divisão por zero).
    """
    require_int(n, minimo=0, nome="n")
    i_d, g_d, pmt_d = require_taxa(i), require_taxa(g, nome="g"), D(pmt)
    if i_d == g_d:
        return D(n) * pmt_d / (D(1) + i_d)
    return pmt_d * (D(1) - ((D(1) + g_d) / (D(1) + i_d)) ** n) / (i_d - g_d)


def fv_growing_annuity(pmt: Number, i: Number, g: Number, n: int) -> Decimal:
    """VF de série crescente: VF = VP_growing·(1+i)^n."""
    return pv_growing_annuity(pmt, i, g, n) * (D(1) + require_taxa(i)) ** n


def perpetuidade(pmt: Number, i: Number, g: Number = 0) -> Decimal:
    """Perpetuidade (crescente): VP = PMT/(i − g). Requer i > g."""
    i_d, g_d = D(i), D(g)
    if i_d <= g_d:
        raise OutOfRange("perpetuidade requer i > g")
    return D(pmt) / (i_d - g_d)


__all__ = [
    "Timing",
    "vf",
    "vp",
    "vf_simples",
    "taxa_equivalente",
    "anual_para_mensal",
    "mensal_para_anual",
    "taxa_real",
    "taxa_nominal",
    "fator_du",
    "vp_anuidade",
    "vf_anuidade",
    "pmt_de_vp",
    "pv_growing_annuity",
    "fv_growing_annuity",
    "perpetuidade",
]
