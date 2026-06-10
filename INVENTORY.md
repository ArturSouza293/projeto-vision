# INVENTORY — todo cálculo financeiro inline no front (pré-integração)

> Fase B, passo 1. Nada foi substituído antes de estar inventariado aqui.
> Status: ✅ migrado para o engine (paridade verificada por golden) · 🔵 fica no
> front por decisão documentada (formatação, posicionamento de UI ou aritmética
> LINEAR sem juros — soma/subtração/percentual simples) · cada 🔵 tem o porquê.

## lib/calc.ts — camada de cálculo principal

| Status | Local | O quê | Resolução |
|---|---|---|---|
| ✅ | `project()` | projeção completa (acum/desacum, eventos, KPIs) | delega a `engine.project` via `lib/engine/adapter.ts` (mensal; deltas em PARITY_NOTES.md) |
| ✅ | `annuityFactor`/`fvOfContributions` | PV/FV de anuidade | `engine/mathcore` (pvAnnuity/fvAnnuity) — zero delta |
| ✅ | `goalFundedPct` | (1+r)^n + FV de aportes | `compound()`/`fvSeries()` do adapter (solveTVM/fvAnnuity do engine) — zero delta |
| 🔵 | `cashFlowTotals`/`monthlyDebtService`/baselines (`monthlyNeeds…`, `essential…`, `recurring…`, `continuing…`, `retirementMonthlyNeed`) | somas e percentuais lineares (sem juros) | fica no lib (boundary); regra equivalente existe em `engine/rules` para uso futuro |
| 🔵 | `emergencyReserveTarget`/`successionTarget` | mult × essenciais; max(0, pct×bruto − prev − seguro) | linear, sem capitalização; espelhado em `engine/rules.alvoReserva/alvoSucessao` |
| 🔵 | `netWorthTotals`/`assetValueBRL`/`investableWealth` | agregação + FX multiplicativo | linear; alimenta o adapter |
| 🔵 | `scoreSuitability` | média normalizada (não-financeiro) | fica |
| 🔵 | `ageFromDob`/`dependentAge` | datas | fica (plumbing) |

## lib/plan.ts

| Status | Local | O quê | Resolução |
|---|---|---|---|
| ✅ | `projectPlan`/`buildProjectionRequest` | pipeline de projeção | flui pelo `project()` engine-backed (1 ponto de troca) |
| ✅ | `defaultGoals` (capital de aposentadoria) | gap×12×annuityFactor | `annuityFactor` agora é engine/mathcore |
| ✅ | `returnCheckpoints` | bisseção p70/full | orquestração: o predicado roda `projectPlan` (engine); a bisseção é controle, não aritmética financeira |
| 🔵 | `defaultAssumptions`/`planCompleteness` | sobra − aportes; % de etapas | linear |

## lib/premises.ts

| Status | Local | O quê | Resolução |
|---|---|---|---|
| 🔵 | `inssRetirementBenefit`/`irrfMonthly`/`irrfEffectiveRate` | min(renda×taxa, teto); faixas IRRF | tabelas de PREMISSA com fonte/ano (lookup linear, sem juros); exibidas no diálogo de premissas |

## lib/plano-ideal.ts + fluxo BIA

| Status | Local | O quê | Resolução |
|---|---|---|---|
| ✅ | fluxo "Plano Ideal" completo | LLM → 4 parâmetros | **Regra Zero**: rota pede proposta ESTRUTURAL → `engine/validator` (whitelist) → `engine.idealPlan` → clamp duplo → racional por template i18n com slots do motor (`lib/engine/plano-ideal-flow.ts`) |
| ✅ | `heuristicParams` (offline) | retorno que financia objetivos | os checkpoints já rodam no engine; caminho offline usa o MESMO `idealViaEngine` determinístico |
| 🔵 | `idealBounds`/`clampParams` | limites/snap dos sliders | clamps lineares de UI (guard-rail duplo por cima do clamp do engine) |

## components

| Status | Local | O quê | Resolução |
|---|---|---|---|
| ✅ | `engine/why-plan.tsx monthlyFor` | PMT p/ FV (tinha Math.pow!) | `monthlyPmtForTarget` do adapter (solveTVM) — número idêntico |
| ✅ | `engine/plano-ideal-button.tsx` | aplicava números da LLM | agora aplica SÓ números do engine; racional = template |
| ✅ | `journey/steps/goals-step.tsx` / `engine/kpi-detail-dialog.tsx` | `goalFundedPct`/achievable | sem edição — as funções importadas viraram engine-backed (retorno 4% hardcoded preservado; ver BACKLOG) |
| 🔵 | `engine/workspace.tsx:264-271` | `freeBalance = surplus − allocated` etc. | subtrações simples (sem juros) — critério de limpeza atendido |
| 🔵 | `charts/wealth-timeline.tsx` / `life-timeline.tsx` | posicionamento pixel↔ano | UI pura |
| 🔵 | `charts/probability-gauge` / `cashflow-bar` / `wealth-area` | geometria SVG, merge de séries, round de display | UI pura |
| 🔵 | `engine/plano-ideal-button.tsx:73` easeOutCubic | easing de ANIMAÇÃO (único Math.pow restante em components/) | não-financeiro |

## Verificação final (Fase B)

- `grep "Math.pow|*(1+|/12|Math.exp" components/` → **apenas** o easing de
  animação e formatação (critério de limpeza ✓).
- `npm run golden:check` → 3 cases dentro de ±R$1/±0,1%, com 7 deltas legítimos
  documentados (PARITY_NOTES.md) e pinados (accepted-deltas.json).
- `golden/smoke.mjs` → workspace renderiza, ghost ao vivo no drag, console limpo.

## Arquivos verificados SEM aritmética financeira

lib/{brand,utils,goal-meta,life-event-meta,types,format*}.ts · lib/db/* · lib/i18n/* · lib/mock/* ·
lib/use-scroll-on-add.ts · lib/store/plan-store.ts (só estado) · lib/cross-sell.ts (heurística de oferta
sobre totals; score log10 não-monetário) · lib/output.ts (consome projectPlan engine-backed) ·
lib/advisor-context.ts (round de display) · app/** (rotas delegam) · components/ui/* · components/app/* ·
demais charts/journey/engine (shell/forms/exibição).

\* `lib/format.ts` é o helper ÚNICO de arredondamento de exibição (C10).
