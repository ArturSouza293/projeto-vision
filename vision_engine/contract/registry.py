"""Tool registry — nome → (modelo de entrada, função) para o tool-calling da LLM.

A LLM escolhe a ferramenta e envia o JSON; ``call_tool`` valida (Pydantic) e
executa, devolvendo o ``ResultEnvelope``. Falha de validação vira erro
estruturado (``OUT_OF_RANGE``) — a LLM pergunta, não chuta.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from contract.errors import CalcError, EngineError, OutOfRange, ToolNotFound
from contract.models import ResultEnvelope

ToolFn = Callable[[Any], ResultEnvelope]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    input_model: type[BaseModel]
    fn: ToolFn
    descricao: str


TOOLS: dict[str, ToolSpec] = {}


def tool(name: str, model: type[BaseModel], descricao: str) -> Callable[[ToolFn], ToolFn]:
    """Decorator que registra uma função do motor como ferramenta da LLM."""

    def deco(fn: ToolFn) -> ToolFn:
        if name in TOOLS and TOOLS[name].fn is not fn:
            raise ValueError(f"ferramenta duplicada no registry: '{name}'")
        TOOLS[name] = ToolSpec(name=name, input_model=model, fn=fn, descricao=descricao)
        return fn

    return deco


def call_tool(name: str, payload: dict[str, Any]) -> ResultEnvelope:
    """Valida o payload e executa a ferramenta ``name`` → envelope."""
    spec = TOOLS.get(name)
    if spec is None:
        raise ToolNotFound(f"ferramenta '{name}' não registrada")
    try:
        entrada = spec.input_model.model_validate(payload)
    except ValidationError as e:
        raise OutOfRange(e.errors().__str__()) from e
    try:
        return spec.fn(entrada)
    except EngineError:
        raise  # já estruturado
    except ValueError as e:
        # erro de domínio das funções puras (ex.: i ≤ g, fluxo não-convencional)
        raise OutOfRange(str(e)) from e
    except (ArithmeticError, LookupError) as e:
        # aritmética degenerada / acesso ausente que escapou da validação
        raise CalcError(f"falha de cálculo em '{name}': {type(e).__name__}") from e


def tool_schemas() -> dict[str, dict[str, Any]]:
    """JSON Schema de entrada de cada ferramenta (para expor à LLM)."""
    return {n: s.input_model.model_json_schema() for n, s in TOOLS.items()}


def list_tools() -> list[dict[str, str]]:
    """Nome + descrição de cada ferramenta registrada."""
    return [{"name": s.name, "descricao": s.descricao} for s in TOOLS.values()]


__all__ = ["ToolSpec", "TOOLS", "tool", "call_tool", "tool_schemas", "list_tools"]
