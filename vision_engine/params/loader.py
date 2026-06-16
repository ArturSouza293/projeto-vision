"""Resolução de parâmetros vigentes por ``data_referencia``.

Single source of truth: os YAML datados em ``params/``. O loader, dado um
``tipo`` (``irpf``, ``macro``, ``ir_investimentos``, …) e uma data, devolve o
conjunto com a MAIOR ``vigencia_inicio`` que ainda seja ≤ ``data_referencia`` —
permitindo recalcular o passado corretamente e versionar mudanças de lei.

Cada resultado carrega ``versao`` (ex.: ``"irpf@2026-01-01"``) para auditoria.

Erros são ESTRUTURADOS (``EngineError``): ``ParamMissing`` quando não há conjunto
vigente para a data; ``ParamInvalid`` quando um YAML está malformado/inconsistente
(detectado na carga — fail-fast, em vez de erro silencioso no cálculo).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

import yaml

from core.errors import ParamInvalid, ParamMissing

PARAMS_DIR = Path(__file__).parent

# (tipo, chave da tabela, nome do campo de fronteira) das tabelas regressivas
# cuja correção depende de ordenação crescente + uma sentinela `null` no fim.
_REGRESSIVAS: tuple[tuple[str, str, str], ...] = (
    ("ir_investimentos", "renda_fixa_regressiva", "ate_dias"),
    ("previdencia", "regressivo", "ate_anos"),
)


@dataclass(frozen=True)
class ParamSet:
    """Um conjunto de parâmetros datado e rastreável."""

    tipo: str
    vigencia_inicio: date
    fonte: str
    versao: str  # ex.: "irpf@2026-01-01"
    dados: dict[str, Any]


def _check_regressiva(dados: dict[str, Any], chave: str, campo: str, ctx: str) -> None:
    """Valida tabela regressiva: faixas crescentes por ``campo`` e UMA sentinela
    ``null`` na última posição. Garante que o ``first-match`` por ordem do YAML
    seja correto (evita alíquota errada silenciosa por reordenação)."""
    faixas = dados.get(chave)
    if not isinstance(faixas, list) or not faixas:
        raise ParamInvalid(f"{ctx}: '{chave}' ausente ou vazio")
    limites = [f.get(campo) for f in faixas]
    nones = [i for i, v in enumerate(limites) if v is None]
    if len(nones) != 1 or nones[0] != len(limites) - 1:
        raise ParamInvalid(
            f"{ctx}: '{chave}' precisa de exatamente uma faixa '{campo}: null' no fim"
        )
    numericos = [int(v) for v in limites[:-1]]
    if numericos != sorted(numericos) or len(set(numericos)) != len(numericos):
        raise ParamInvalid(
            f"{ctx}: '{chave}' deve estar em ordem crescente e sem '{campo}' repetido"
        )


def _validate_dados(tipo: str, dados: dict[str, Any], ctx: str) -> None:
    """Invariantes por tipo, conferidas na carga (fail-fast)."""
    for t, chave, campo in _REGRESSIVAS:
        if tipo == t:
            _check_regressiva(dados, chave, campo, ctx)
    if tipo == "iof":
        por_dia = dados.get("por_dia")
        if not isinstance(por_dia, dict):
            raise ParamInvalid(f"{ctx}: 'por_dia' ausente")
        faltando = [d for d in range(1, 30) if str(d) not in por_dia]
        if faltando:
            raise ParamInvalid(f"{ctx}: 'por_dia' sem os dias {faltando} (precisa 1..29)")
    if tipo == "irpf":
        red = dados.get("mensal", {}).get("redutor_lei_15270")
        if red is not None:
            try:
                isencao = float(red["isencao_ate"])
                fim = float(red["reducao_fim"])
            except (KeyError, TypeError, ValueError) as e:
                raise ParamInvalid(f"{ctx}: redutor_lei_15270 mal-formado") from e
            if not 0 < isencao < fim:
                raise ParamInvalid(
                    f"{ctx}: redutor exige 0 < isencao_ate ({isencao}) < reducao_fim ({fim})"
                )


def _parse_file(p: Path) -> ParamSet:
    raw = cast(dict[str, Any], yaml.safe_load(p.read_text(encoding="utf-8")))
    try:
        vig_raw = raw["vigencia_inicio"]
        tipo = str(raw["tipo"])
    except (KeyError, TypeError) as e:
        raise ParamInvalid(f"{p.name}: YAML sem 'tipo'/'vigencia_inicio'") from e
    vig = vig_raw if isinstance(vig_raw, date) else date.fromisoformat(str(vig_raw))
    dados = cast(dict[str, Any], raw.get("dados", {}))
    _validate_dados(tipo, dados, p.name)
    return ParamSet(
        tipo=tipo,
        vigencia_inicio=vig,
        fonte=str(raw.get("fonte", "")),
        versao=f"{tipo}@{vig.isoformat()}",
        dados=dados,
    )


@lru_cache(maxsize=1)
def _all_sets() -> tuple[ParamSet, ...]:
    sets = [_parse_file(p) for p in sorted(PARAMS_DIR.glob("*.yaml"))]
    vistos: set[tuple[str, date]] = set()
    for s in sets:
        chave = (s.tipo, s.vigencia_inicio)
        if chave in vistos:
            raise ParamInvalid(
                f"parâmetro duplicado: '{s.tipo}' com vigência {s.vigencia_inicio.isoformat()}"
            )
        vistos.add(chave)
    return tuple(sorted(sets, key=lambda s: s.vigencia_inicio))


def load_params(tipo: str, data_referencia: date) -> ParamSet:
    """Conjunto vigente de ``tipo`` na ``data_referencia`` (o mais recente ≤ data)."""
    do_tipo = [s for s in _all_sets() if s.tipo == tipo]
    candidatos = [s for s in do_tipo if s.vigencia_inicio <= data_referencia]
    if not candidatos:
        if do_tipo:
            mais_antiga = min(s.vigencia_inicio for s in do_tipo).isoformat()
            raise ParamMissing(
                f"sem parâmetros '{tipo}' vigentes em {data_referencia.isoformat()} "
                f"(o mais antigo disponível começa em {mais_antiga})"
            )
        raise ParamMissing(
            f"tipo de parâmetro desconhecido: '{tipo}' "
            f"(disponíveis: {sorted(available_tipos())})"
        )
    return max(candidatos, key=lambda s: s.vigencia_inicio)


def available_tipos() -> set[str]:
    """Conjunto de ``tipo`` disponíveis em ``params/``."""
    return {s.tipo for s in _all_sets()}


__all__ = ["ParamSet", "load_params", "available_tipos", "PARAMS_DIR"]
