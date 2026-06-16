"""Tipo monetário e contexto decimal central do motor.

REGRA: PROIBIDO ``float`` no caminho de cálculo — todo valor monetário e toda
taxa são ``Decimal`` com arredondamento explícito. ``float`` introduz erro
binário (ex.: 0.1 + 0.2 != 0.3) inaceitável em contexto auditável.

Arredondamento padrão: ``ROUND_HALF_EVEN`` (bankers' rounding) — neutro em
viés estatístico. Arredonda-se SÓ na exibição/quantização; o motor carrega
precisão total (28 dígitos) internamente.
"""

from __future__ import annotations

from decimal import ROUND_HALF_EVEN, Decimal, InvalidOperation, getcontext

from core.errors import OutOfRange

# Precisão alta no contexto global (28 dígitos significativos). Coincide com o
# default do CPython; reafirmamos para não depender de ordem de import.
getcontext().prec = 28

CENT = Decimal("0.01")

Number = Decimal | int | str
"""Entradas aceitas pelo construtor ``D`` — nunca ``float``."""


def D(x: Number) -> Decimal:
    """Constrói um ``Decimal`` a partir de ``int``/``str``/``Decimal``.

    Rejeita ``float`` (reintroduziria erro binário no caminho de cálculo) e
    também valores **não-finitos** (``NaN``/``Infinity``) ou strings numéricas
    inválidas — que, como um ``float``, contaminariam o cálculo e quebrariam a
    auditabilidade. Entrada inválida vira ``OutOfRange`` (erro estruturado).
    """
    if isinstance(x, float):
        raise TypeError("float é proibido no caminho de cálculo — passe str ou Decimal")
    try:
        d = Decimal(x)
    except (InvalidOperation, ValueError) as e:
        raise OutOfRange(f"valor numérico inválido: {x!r}") from e
    if not d.is_finite():
        raise OutOfRange(f"valor não-finito proibido no cálculo: {x!r}")
    return d


def require_int(n: int, *, minimo: int, nome: str) -> int:
    """Exige ``n`` inteiro ≥ ``minimo`` (prazos/períodos). ``OutOfRange`` caso contrário.

    Entradas inválidas (n negativo, n=0 onde é divisor) precisam ser REJEITADAS,
    não classificadas em silêncio — princípio de auditabilidade do motor.
    """
    if not isinstance(n, int) or isinstance(n, bool) or n < minimo:
        raise OutOfRange(f"{nome} deve ser inteiro >= {minimo} (recebido {n!r})")
    return n


def require_taxa(i: Number, *, nome: str = "i") -> Decimal:
    """Exige taxa com ``1 + i > 0`` (i > −1). Necessário antes de ``(1+i)^x`` e
    de divisões por ``(1+i)`` — evita base ≤ 0 / divisão por zero degeneradas."""
    d = D(i)
    if d <= D(-1):
        raise OutOfRange(f"{nome} deve ser > -1 (1+{nome} deve ser > 0); recebido {d}")
    return d


def brl(x: Decimal) -> Decimal:
    """Quantiza para centavos (2 casas), ``ROUND_HALF_EVEN``. Use só na borda."""
    return Decimal(x).quantize(CENT, rounding=ROUND_HALF_EVEN)


def quantize(x: Decimal, places: str = "0.01") -> Decimal:
    """Quantiza ``x`` para a escala ``places`` (ex.: ``"0.0001"`` p/ taxas)."""
    return Decimal(x).quantize(Decimal(places), rounding=ROUND_HALF_EVEN)
