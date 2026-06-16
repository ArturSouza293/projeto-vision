"""Tipo monetário e contexto decimal central do motor.

REGRA: PROIBIDO ``float`` no caminho de cálculo — todo valor monetário e toda
taxa são ``Decimal`` com arredondamento explícito. ``float`` introduz erro
binário (ex.: 0.1 + 0.2 != 0.3) inaceitável em contexto auditável.

Arredondamento padrão: ``ROUND_HALF_EVEN`` (bankers' rounding) — neutro em
viés estatístico. Arredonda-se SÓ na exibição/quantização; o motor carrega
precisão total (28 dígitos) internamente.
"""

from __future__ import annotations

from decimal import ROUND_HALF_EVEN, Decimal, getcontext

# Precisão alta no contexto global (28 dígitos significativos).
getcontext().prec = 28

CENT = Decimal("0.01")

Number = Decimal | int | str
"""Entradas aceitas pelo construtor ``D`` — nunca ``float``."""


def D(x: Number) -> Decimal:
    """Constrói um ``Decimal`` a partir de ``int``/``str``/``Decimal``.

    Rejeita ``float`` explicitamente: aceitar ``float`` reintroduziria erro de
    ponto-flutuante no caminho de cálculo, quebrando a auditabilidade.
    """
    if isinstance(x, float):
        raise TypeError("float é proibido no caminho de cálculo — passe str ou Decimal")
    return Decimal(x)


def brl(x: Decimal) -> Decimal:
    """Quantiza para centavos (2 casas), ``ROUND_HALF_EVEN``. Use só na borda."""
    return Decimal(x).quantize(CENT, rounding=ROUND_HALF_EVEN)


def quantize(x: Decimal, places: str = "0.01") -> Decimal:
    """Quantiza ``x`` para a escala ``places`` (ex.: ``"0.0001"`` p/ taxas)."""
    return Decimal(x).quantize(Decimal(places), rounding=ROUND_HALF_EVEN)
