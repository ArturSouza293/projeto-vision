"""Erros estruturados do motor (re-exporta ``core.errors``).

A taxonomia vive em ``core.errors`` para evitar ciclo de import (este pacote,
ao ser importado, registra todas as ferramentas). Camadas baixas levantam erro
estruturado importando de ``core.errors``; aqui mantemos os nomes para compat.
"""

from __future__ import annotations

from core.errors import (
    CalcError,
    EngineError,
    OutOfRange,
    ParamInvalid,
    ParamMissing,
    ToolNotFound,
)

__all__ = [
    "EngineError",
    "ParamMissing",
    "ParamInvalid",
    "OutOfRange",
    "CalcError",
    "ToolNotFound",
]
