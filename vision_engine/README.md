# Vision Engine (Python) — motor financeiro determinístico e auditável

Motor de cálculo do Projeto Vision **especializado no Brasil**, **determinístico**
(mesma entrada + mesma versão de parâmetros ⇒ mesma saída) e **auditável** (todo
número vem de código testado; a LLM apenas lê e narra — nunca calcula).

> **Status:** fundação (núcleo de cálculo + camada de parâmetros). Tributação,
> mercado, planejamento e contrato com a LLM nas próximas fases — ver
> [`MIGRATION.md`](MIGRATION.md).

## Princípio inegociável

A LLM **não faz aritmética** nem reproduz/estima parâmetros tributários. Ela
orquestra (interpreta intenção → chama o motor) e **narra** resultados
estruturados. Isso garante auditabilidade — requisito de contexto regulado
(CVM 178/179; dever fiduciário fee-based).

## Estrutura

```
core/      funções puras em Decimal (sem I/O): money, tvm, cashflow, amortizacao
params/    Apêndice (Parte 5 do PDF) externalizado: YAML datado + loader
tests/     golden (âncoras HP-12C) + property-based (hypothesis)
```

- **Sem `float`** no caminho de cálculo — `core.money.D()` rejeita `float`;
  tudo é `Decimal` (prec 28, `ROUND_HALF_EVEN`); arredonda só na borda (`brl`).
- **Parâmetros versionados e datados** — `params.loader.load_params(tipo,
  data_referencia)` devolve o conjunto vigente + `versao` rastreável.

## Como rodar (venv local)

```bash
# da pasta vision_engine/
.venv/Scripts/python -m pytest -q          # 36 testes
.venv/Scripts/python -m ruff check core params
.venv/Scripts/python -m mypy               # --strict (configurado no pyproject)
```

Dependências de dev em `pyproject.toml` (`pytest`, `hypothesis`, `mypy`, `ruff`,
`pyyaml`). Python 3.11+ (o brief sugere 3.12+; o código roda em 3.11).

## Exemplo

```python
from datetime import date
from core.tvm import anual_para_mensal, taxa_real, vf_anuidade
from params.loader import load_params

anual_para_mensal("0.12")          # 0.00948879... (12% a.a. -> a.m.)
taxa_real("0.10", "0.04")          # 0.0576923... (Fisher exato)
vf_anuidade("1000", "0.01", 12)    # 12682.50... (FV de 12 aportes)

irpf = load_params("irpf", date(2026, 6, 1))
irpf.versao                        # "irpf@2026-01-01"  (auditável)
```
