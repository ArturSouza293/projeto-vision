"""Modelos Pydantic do contrato motor ↔ LLM.

Saída SEMPRE um ``ResultEnvelope`` padronizado (valor + auditoria). Entradas
validadas por modelo (JSON Schema automático para o tool-calling).

NOTA: valores monetários e taxas devem chegar como STRING no JSON (ex.:
``"10000"``, ``"0.12"``) para virarem ``Decimal`` EXATO. O system prompt da
orquestração deve instruir a LLM a enviar números como string.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class ResultEnvelope(BaseModel):
    """Envelope auditável de resultado do motor."""

    model_config = ConfigDict(extra="forbid")

    valor: Decimal
    unidade: str  # "BRL", "% a.a.", "meses", ...
    formula: str  # método/fórmula aplicada (auditoria)
    premissas: dict[str, str] = Field(default_factory=dict)
    parametros_versao: str | None = None  # ex.: "irpf@2026-01-01"
    passos: list[str] = Field(default_factory=list)
    detalhe: dict[str, str] | None = None  # tabelas/decomposições

    @field_serializer("valor")
    def _serializa_valor(self, v: Decimal) -> str:
        """Decimal → string no JSON (preserva exatidão; nunca vira float)."""
        return str(v)


class IrpfMensalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    base: Decimal = Field(gt=0, description="Base de cálculo mensal (R$)")
    data_referencia: date


class IrRendaFixaInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rendimento: Decimal = Field(ge=0)
    dias_corridos: int = Field(gt=0)
    produto: str = Field(default="CDB", description="CDB, LCI, LCA, TESOURO, ...")
    data_referencia: date


class GanhoCapitalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ganho: Decimal = Field(ge=0)
    data_referencia: date


class CdbLiquidoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    valor: Decimal = Field(gt=0)
    pct_cdi: Decimal = Field(gt=0, description="ex.: 120 = 120% do CDI")
    prazo_dias_uteis: int = Field(gt=0)
    prazo_dias_corridos: int = Field(gt=0)
    data_referencia: date


class AporteObjetivoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vf_meta: Decimal = Field(gt=0)
    vp_atual: Decimal = Field(ge=0)
    taxa_real_aa: Decimal = Field(ge=0)
    meses: int = Field(gt=0)


__all__ = [
    "ResultEnvelope",
    "IrpfMensalInput",
    "IrRendaFixaInput",
    "GanhoCapitalInput",
    "CdbLiquidoInput",
    "AporteObjetivoInput",
]
