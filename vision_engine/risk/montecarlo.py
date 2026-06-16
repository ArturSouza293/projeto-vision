"""Monte Carlo determinístico (seed EXPOSTO) para a fase de acumulação.

Estima a distribuição do patrimônio final dado aporte mensal, retorno real
esperado (μ) e volatilidade (σ). Mesma entrada + mesma seed ⇒ mesma saída.

NOTA sobre ``float``: a SIMULAÇÃO é estocástica e usa amostragem gaussiana
(``float``) — é a exceção explícita do brief ("Monte Carlo usa seed fixo e
exposto"). O caminho de cálculo DETERMINÍSTICO (core/tax/market/planning)
permanece 100% em ``Decimal``; aqui só as SAÍDAS (percentis/média) são
quantizadas de volta para ``Decimal`` na borda.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal

from core.errors import OutOfRange
from core.money import D, Number, brl, quantize, require_int


@dataclass(frozen=True)
class ResultadoMonteCarlo:
    """Distribuição do patrimônio final (percentis e média), em Decimal."""

    seed: int
    n_simulacoes: int
    meses: int
    p5: Decimal
    p50: Decimal
    p95: Decimal
    media: Decimal
    prob_atingir_meta: Decimal | None


def _dec2(x: float) -> Decimal:
    """float -> Decimal de 2 casas, sem reintroduzir float no caminho (via str)."""
    return brl(D(str(round(x, 2))))


def simular_acumulacao(
    vp_inicial: Number,
    aporte_mensal: Number,
    mu_real_aa: Number,
    sigma_aa: Number,
    anos: int,
    *,
    seed: int,
    n_simulacoes: int = 10_000,
    meta: Number | None = None,
) -> ResultadoMonteCarlo:
    """Simula ``n_simulacoes`` trajetórias de acumulação (passo mensal)."""
    require_int(anos, minimo=1, nome="anos")
    require_int(n_simulacoes, minimo=1, nome="n_simulacoes")
    if D(mu_real_aa) <= D(-1):
        raise OutOfRange("mu_real_aa deve ser > -1 (1+μ > 0)")
    if D(sigma_aa) < 0:
        raise OutOfRange("sigma_aa deve ser >= 0")
    rng = random.Random(seed)
    meses = anos * 12
    vp0 = float(D(vp_inicial))
    aporte = float(D(aporte_mensal))
    mu_m = (1.0 + float(D(mu_real_aa))) ** (1.0 / 12.0) - 1.0
    sigma_m = float(D(sigma_aa)) / (12.0**0.5)

    finais: list[float] = []
    for _ in range(n_simulacoes):
        w = vp0
        for _ in range(meses):
            r = rng.gauss(mu_m, sigma_m)
            w = (w + aporte) * (1.0 + r)
        finais.append(w)
    finais.sort()

    def pct(p: float) -> Decimal:
        # percentil com interpolação linear (sem viés de rank), base 0..n-1
        if len(finais) == 1:
            return _dec2(finais[0])
        pos = p * (len(finais) - 1)
        lo = int(pos)
        hi = min(lo + 1, len(finais) - 1)
        val = finais[lo] + (finais[hi] - finais[lo]) * (pos - lo)
        return _dec2(val)

    media = _dec2(sum(finais) / len(finais))
    prob: Decimal | None = None
    if meta is not None:
        alvo = float(D(meta))
        atingiram = sum(1 for f in finais if f >= alvo)
        # probabilidade quantizada (4 casas) — não vaza Decimal de 28 dígitos
        prob = quantize(D(atingiram) / D(len(finais)), "0.0001")

    return ResultadoMonteCarlo(
        seed=seed,
        n_simulacoes=n_simulacoes,
        meses=meses,
        p5=pct(0.05),
        p50=pct(0.50),
        p95=pct(0.95),
        media=media,
        prob_atingir_meta=prob,
    )


__all__ = ["ResultadoMonteCarlo", "simular_acumulacao"]
