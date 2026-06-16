# MIGRATION — auditoria do motor atual e plano de migração

> Brief §10.1: "Auditar o motor atual: mapear onde há `float`, onde a LLM
> calcula/decide número, onde parâmetros estão hard-coded." Este documento é o
> resultado dessa auditoria + o plano faseado. Fonte do domínio:
> `Vision_Base_Conhecimento_Motor.pdf`.

## 0. Decisão de arquitetura (confirmada com o usuário)

Construir `vision_engine/` como **motor Python standalone e auditável** (esta
pasta), **sem tocar no app por ora**. A integração ao front fica para uma fase
explícita — provável **híbrido**: o motor TS (`engine/`) segue alimentando o
**recálculo AO VIVO** no navegador (arrasto de sliders/timeline, <5 ms), e o
motor Python vira a **fonte de verdade auditável** para tributação e cálculos
sensíveis. Motivo: um serviço Python por HTTP a cada arrasto quebraria a UX
central da demo.

## 1. Estado atual (motor TS — `engine/`, ~2.846 LOC, 115 testes)

**Pontos fortes (já alinhados ao brief):**

- **Regra Zero já implementada.** A LLM (BIA) só propõe ESTRUTURA (ordem de
  prioridade, anos-alvo, método de aposentadoria, flags). `engine/validator.ts`
  rejeita qualquer payload com número fora da whitelist (inclusive número
  embutido em string). A rota `app/api/plano-ideal/route.ts` devolve só a
  proposta estrutural; o motor calcula tudo. **Esse limite migra 1:1.**
- Funções puras, stateless, sem I/O. Convenções CFP C1–C10 documentadas.
- Âncoras HP-12C (tol. 1e-6), property-based (seed fixa), bench < 5 ms.

**Gaps vs. o brief (em ordem de valor):**

| # | Gap | Onde hoje | Alvo Python |
|---|-----|-----------|-------------|
| G1 | **Sem tributação BR** — não há IRPF, IR de investimentos (regressiva), IOF, ganho de capital nem previdência | inexistente | `tax/` (lê `params/`) |
| G2 | **Parâmetros hard-coded** (retorno, inflação, INSS, reserva) em código | `engine/assumptions.ts`, `lib/premises.ts` | `params/*.yaml` datado/versionado + `loader.py` |
| G3 | **`float` em todo o caminho** (`number` do TS/JS — IEEE-754) | todo `engine/` e `lib/calc.ts` | `Decimal` (prec 28, `ROUND_HALF_EVEN`) |
| G4 | **Sem contrato estruturado p/ LLM** (tool registry + envelope `{valor, formula, parametros_versao, passos}`) | proposta é JSON ad-hoc | `contract/` (Pydantic + JSON Schema) |
| G5 | **Sem `market/`** (precificação renda fixa base 252) e **sem Monte Carlo** | inexistente | `market/`, `risk/montecarlo.py` |

**`float` / aritmética na borda LLM:** a LLM **não** faz aritmética hoje (Regra
Zero), então não há "LLM calculando número" a remover — só a reforçar com o
envelope/erros estruturados. O `float` está 100% no motor TS e em `lib/calc.ts`
(client-side), não na LLM.

## 2. Entregue nesta rodada (fundação + auditoria)

```
vision_engine/
├── core/        money.py · tvm.py · cashflow.py · amortizacao.py   (Decimal puro)
├── params/      6 YAML do Apêndice (Parte 5 do PDF) + loader.py    (G2 resolvido p/ a base)
├── tests/       golden (âncoras HP-12C) + property (hypothesis)    (36 testes)
└── pyproject.toml  (mypy --strict · ruff · pytest)
```

- **G3 resolvido na base:** `core/money.py` proíbe `float` no construtor `D()`;
  tudo é `Decimal` com arredondamento só na borda (`brl`).
- **G2 resolvido para os parâmetros do PDF:** Apêndice externalizado em YAML
  datado, com `fonte`; `loader.load_params(tipo, data_referencia)` resolve o
  vigente e devolve `versao` auditável (ex.: `irpf@2026-01-01`).
- Âncoras reproduzidas (idênticas ao motor TS): 12% a.a.→0,948879% a.m.; Fisher
  10%/4%→5,76923%; FV anuidade 12.682,50 / antecipada 12.809,33; PV Price
  166.791,61; SAC amort 1.000/1ª 2.200/última 1.010; growing g=i→952,38.
- **Gate verde:** `ruff` limpo, `mypy --strict` limpo, `pytest` 36/36.

## 3. Plano faseado (próximas rodadas)

1. **`tax/`** (G1 — maior valor): `irpf.py` (Lei 15.270 + redutor calibrado ao
   texto oficial, golden values), `ir_investimentos.py` (regressiva + come-cotas
   + FII + ações + JCP + exterior; isenções LCI/LCA mantidas), `iof.py` (vetor
   0–30), `ganho_capital.py` (faixas progressivas + isenções), `previdencia.py`
   (regressivo × progressivo, PGBL × VGBL). Cobertura ≥ 90%.
2. **`market/`**: `indexadores.py` (CDI/Selic/IPCA, fator base 252) +
   `renda_fixa.py` (preço/rentabilidade Tesouro, CDB %CDI, líquido de IR/IOF).
3. **`planning/`**: aposentadoria, objetivos (PMT necessário), reserva, dívidas
   (CET), alocação, seguros — sobre `core` + `tax`. Espelhar as convenções
   C1–C10 do motor TS (paridade de números onde fizer sentido).
4. **`contract/`** (G4): `models.py` (Pydantic + `ResultEnvelope`), `errors.py`
   (`PARAM_MISSING`, `OUT_OF_RANGE`), `registry.py` (tool registry + JSON Schema)
   e os guardrails de system prompt (Seção 6 do brief).
5. **`risk/montecarlo.py`** (seed exposto) + CI (`ruff`/`mypy`/`pytest --cov`).
6. **Integração** (decisão à parte): expor o motor (FastAPI?) e religar o front
   ao envelope — onde a decisão de deploy/host entra (ex.: Railway, que o
   usuário já usa). Provável híbrido (TS p/ ao vivo, Python p/ imposto/auditoria).

## 4. A confirmar contra fontes oficiais (não assumir)

- **Faixa de redução IRPF R$ 5.000,01–7.350** (Lei 15.270): a fórmula exata do
  redutor decrescente precisa ser calibrada ao texto oficial (o esqueleto linear
  do brief é aproximação). Cobrir com golden values conferidos.
- Teto do desconto simplificado anual; teto INSS 2026; salário mínimo 2026.
- IOF câmbio (alíquotas mudaram em 2025 — tratar como parâmetro datado).
- Alíquotas/vigência de ganho de capital e ITCMD (tendência de progressividade).
