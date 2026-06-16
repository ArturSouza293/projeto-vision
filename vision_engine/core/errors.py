"""Erros estruturados do motor — camada BASE, sem dependências.

Mora em ``core/`` (e não em ``contract/``) de propósito: assim qualquer camada
— ``core``, ``params``, ``tax``, ``planning``, ``market`` — pode levantar um erro
estruturado sem disparar ``contract/__init__`` (que importa todas as ferramentas
e criaria ciclo de import). ``contract.errors`` apenas re-exporta daqui.

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


class ParamInvalid(EngineError):
    """Parâmetro (YAML) malformado ou inconsistente, detectado na carga."""

    codigo = "PARAM_INVALID"


class OutOfRange(EngineError):
    """Entrada inválida ou fora da faixa aceita (falha de validação de domínio)."""

    codigo = "OUT_OF_RANGE"


class CalcError(EngineError):
    """Falha de cálculo não prevista (aritmética degenerada que escapou da validação)."""

    codigo = "CALC_ERROR"


class ToolNotFound(EngineError):
    """Ferramenta não registrada no registry."""

    codigo = "TOOL_NOT_FOUND"


__all__ = [
    "EngineError",
    "ParamMissing",
    "ParamInvalid",
    "OutOfRange",
    "CalcError",
    "ToolNotFound",
]
