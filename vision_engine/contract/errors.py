"""Erros estruturados do motor.

Quando falta um dado ou um valor está fora de faixa, o motor devolve um erro
ESTRUTURADO (código + detalhe) e a LLM **pergunta** ao usuário — nunca "chuta".
"""

from __future__ import annotations


class EngineError(Exception):
    """Base dos erros estruturados. Subclasses definem ``codigo``."""

    codigo: str = "ENGINE_ERROR"

    def __init__(self, detalhe: str) -> None:
        super().__init__(detalhe)
        self.detalhe = detalhe

    def to_dict(self) -> dict[str, str]:
        return {"erro": self.codigo, "detalhe": self.detalhe}


class ParamMissing(EngineError):
    """Parâmetro vigente não encontrado para a data de referência."""

    codigo = "PARAM_MISSING"


class OutOfRange(EngineError):
    """Entrada inválida ou fora da faixa aceita (falha de validação)."""

    codigo = "OUT_OF_RANGE"


class ToolNotFound(EngineError):
    """Ferramenta não registrada no registry."""

    codigo = "TOOL_NOT_FOUND"


__all__ = ["EngineError", "ParamMissing", "OutOfRange", "ToolNotFound"]
