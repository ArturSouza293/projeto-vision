"""Resolução de parâmetros vigentes por ``data_referencia``.

Single source of truth: os YAML datados em ``params/``. O loader, dado um
``tipo`` (``irpf``, ``macro``, ``ir_investimentos``, …) e uma data, devolve o
conjunto com a MAIOR ``vigencia_inicio`` que ainda seja ≤ ``data_referencia`` —
permitindo recalcular o passado corretamente e versionar mudanças de lei.

Cada resultado carrega ``versao`` (ex.: ``"irpf@2026-01-01"``) para auditoria.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

import yaml

PARAMS_DIR = Path(__file__).parent


@dataclass(frozen=True)
class ParamSet:
    """Um conjunto de parâmetros datado e rastreável."""

    tipo: str
    vigencia_inicio: date
    fonte: str
    versao: str  # ex.: "irpf@2026-01-01"
    dados: dict[str, Any]


def _parse_file(p: Path) -> ParamSet:
    raw = cast(dict[str, Any], yaml.safe_load(p.read_text(encoding="utf-8")))
    vig_raw = raw["vigencia_inicio"]
    vig = vig_raw if isinstance(vig_raw, date) else date.fromisoformat(str(vig_raw))
    tipo = str(raw["tipo"])
    return ParamSet(
        tipo=tipo,
        vigencia_inicio=vig,
        fonte=str(raw.get("fonte", "")),
        versao=f"{tipo}@{vig.isoformat()}",
        dados=cast(dict[str, Any], raw.get("dados", {})),
    )


@lru_cache(maxsize=1)
def _all_sets() -> tuple[ParamSet, ...]:
    sets = [_parse_file(p) for p in sorted(PARAMS_DIR.glob("*.yaml"))]
    return tuple(sorted(sets, key=lambda s: s.vigencia_inicio))


def load_params(tipo: str, data_referencia: date) -> ParamSet:
    """Conjunto vigente de ``tipo`` na ``data_referencia`` (o mais recente ≤ data)."""
    candidatos = [
        s for s in _all_sets() if s.tipo == tipo and s.vigencia_inicio <= data_referencia
    ]
    if not candidatos:
        raise LookupError(
            f"sem parâmetros '{tipo}' vigentes em {data_referencia.isoformat()}"
        )
    return max(candidatos, key=lambda s: s.vigencia_inicio)


def available_tipos() -> set[str]:
    """Conjunto de ``tipo`` disponíveis em ``params/``."""
    return {s.tipo for s in _all_sets()}


__all__ = ["ParamSet", "load_params", "available_tipos", "PARAMS_DIR"]
