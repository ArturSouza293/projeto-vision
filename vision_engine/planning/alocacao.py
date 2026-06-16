"""Alocação estratégica por perfil (PDF §4.7).

MODELO ILUSTRATIVO: os pesos-alvo abaixo são uma heurística de planejamento (não
um parâmetro regulatório/tributário), a calibrar com a Política de Investimentos.
São documentados aqui em vez de ``params/`` por não virem do Apêndice do PDF.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from core.money import D

Perfil = Literal["conservador", "moderado", "arrojado"]

# Pesos-alvo por classe (somam 1,0). ILUSTRATIVOS.
ALOCACAO_ALVO: dict[Perfil, dict[str, Decimal]] = {
    "conservador": {
        "renda_fixa": D("0.80"),
        "multimercado": D("0.10"),
        "renda_variavel": D("0.05"),
        "internacional": D("0.05"),
    },
    "moderado": {
        "renda_fixa": D("0.55"),
        "multimercado": D("0.20"),
        "renda_variavel": D("0.15"),
        "internacional": D("0.10"),
    },
    "arrojado": {
        "renda_fixa": D("0.30"),
        "multimercado": D("0.25"),
        "renda_variavel": D("0.30"),
        "internacional": D("0.15"),
    },
}


def alocacao_alvo(perfil: Perfil) -> dict[str, Decimal]:
    """Pesos-alvo por classe para o ``perfil``."""
    return ALOCACAO_ALVO[perfil]


def desvio_rebalanceamento(
    atual: dict[str, Decimal], perfil: Perfil
) -> dict[str, Decimal]:
    """Desvio (atual − alvo) por classe; positivo = sobrealocado."""
    alvo = ALOCACAO_ALVO[perfil]
    classes = set(alvo) | set(atual)
    return {c: D(atual.get(c, D(0))) - alvo.get(c, D(0)) for c in sorted(classes)}


__all__ = ["Perfil", "ALOCACAO_ALVO", "alocacao_alvo", "desvio_rebalanceamento"]
