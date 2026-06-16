"""Contrato motor ↔ LLM: envelope, erros, registry e ferramentas registradas.

Importar este pacote registra todas as ferramentas (efeito de ``tools``).
"""

from contract import tools as _tools  # noqa: F401  (registra as ferramentas)
from contract.errors import EngineError, OutOfRange, ParamMissing, ToolNotFound
from contract.models import ResultEnvelope
from contract.prompt import SYSTEM_PROMPT_GUARDRAILS
from contract.registry import call_tool, list_tools, tool_schemas

__all__ = [
    "call_tool",
    "list_tools",
    "tool_schemas",
    "ResultEnvelope",
    "EngineError",
    "OutOfRange",
    "ParamMissing",
    "ToolNotFound",
    "SYSTEM_PROMPT_GUARDRAILS",
]
