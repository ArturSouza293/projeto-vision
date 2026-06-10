# Vision Engine

Motor de cálculo de planejamento financeiro (padrão CFP) do Projeto Vision.
TypeScript puro, **zero dependência de UI**, funções puras e stateless.

> **Números ilustrativos.** O motor valida FUNCIONALIDADE; as premissas em
> [`assumptions.ts`](assumptions.ts) são decisões de negócio ilustrativas e o
> resultado **não é certificado fiscal nem atuarialmente**. CET de
> financiamentos está fora do escopo (os schedules são "juros efetivos, sem CET").

## Regra Zero — a LLM não calcula nada

O engine é a **única fonte de aritmética do app**. A BIA (LLM) apenas propõe
estrutura — ordem de prioridade dos objetivos, anos-alvo candidatos,
multiplicador de reserva (6|12), método de aposentadoria e flags booleanas —
via [`validator.ts`](validator.ts), que rejeita qualquer payload com campos
fora da whitelist, inclusive números embutidos em strings. O racional exibido
é template do app interpolado com `PlanParameters.racionalSlots` (saída do
motor); a LLM nunca redige um valor numérico.

## Contrato

```ts
import { engine } from "@/engine";

engine.project(case)            // Projection — loop mensal, saída anual
engine.solveGoal(case, goalId)  // PMT p/ alvo + ano viável (bisseção), clamped à sobra
engine.idealPlan(case, bia?)    // determinístico; proposta da BIA já VALIDADA
engine.solveTVM(query)          // n, i, pv, pmt ou fv (+ BEG/END)
```

`CaseStore` em memória (`createCase/getCase/updateCase`) em [`case-store.ts`](case-store.ts).

## Convenções CFP (C1–C10)

| # | Convenção | Onde |
|---|---|---|
| C1 | Granularidade **mensal** interna; saída anual; eventos têm `mes` (1–12, default 1); 13º via `mesesPorAno: 13` (extra em dezembro) | `projection.ts` |
| C2 | Taxas **efetivas compostas** (BR): `i_m = (1+i_aa)^(1/12) − 1` — nunca nominal/12 | `mathcore.ts annualToMonthly` |
| C3 | **Fisher exato**: `real = (1+nom)/(1+inf) − 1` — nunca subtração | `mathcore.ts fisherReal` |
| C4 | **Moeda constante** default (`modoProjecao: "real"`); modo nominal = transformação exata de Fisher em UM único ponto (saída) — misturar é estruturalmente impossível | `projection.ts inflateProjection` |
| C5 | Timing explícito `"end"|"begin"` (BEG/END HP-12C); default do app `"end"` | `mathcore.ts`, `assumptions.ts` |
| C6 | `crescimentoRealAA` por item (growing annuities, incl. caso `g = r`: PV = n·C/(1+r)) | `mathcore.ts pvGrowingAnnuity` |
| C7 | Retorno **geométrico**; calibração: `μ_geo ≈ μ_arit − σ²/2` (volatility drag, relevante p/ Monte Carlo v2) | `assumptions.ts` |
| C8 | Aposentadoria em 3 métodos: `depletion` (default, conta centenária até 100), `preservation`, `perpetuity`; **INSS abate a renda-alvo** | `rules.ts`, `projection.ts` |
| C9 | Amortização BR: **Price e SAC** com taxa efetiva mensal | `amortization.ts` |
| C10 | Arredondamento **só na exibição** — o motor entrega precisão total | todo o pacote |

## Decisões de modelagem (documentadas)

- Idade incrementa na virada do ano-calendário (aniversário ≈ 1º de janeiro).
- Na desacumulação, os itens de despesa são SUBSTITUÍDOS pela renda-alvo de
  aposentadoria; a carteira financia o gap líquido de INSS/rendas contínuas.
- Déficit recorrente de caixa na acumulação é **flagado** (`flags.anosNegativos`)
  mas não é auto-financiado pelo patrimônio (paridade com o app v2); eventos de
  vida (saídas) **drenam** o patrimônio (ordem: liquidez → plano → outros →
  exterior → previdência; imóvel/seguro nunca).
- Case parcial não lança exceção — defaults documentados em `assumptions.ts`.
- `anoBase` deve ser passado pelo adapter (determinismo); o fallback usa o ano
  corrente apenas para não quebrar cases parciais.

## Testes e bench

```bash
npm test     # 115 testes: âncoras HP-12C (tol. rel. 1e-6), invariantes,
             # property-based (50 cases, seed fixa), validador Regra Zero
npm run bench  # project() 780 meses + 20 eventos + 10 despesas — gate < 5 ms
```

Âncoras canônicas: 12% a.a. → 0,948879% a.m. · Fisher 10%/4% → 5,76923% ·
FV(1.000; 1%; 12m) 12.682,50 / antecipada 12.809,33 · PV Price(1.000; 0,5%;
360m) 166.791,61 · SAC(120k; 120m; 1%) amort 1.000 / 1ª 2.200 / última 1.010 ·
growing g=r (100; 5%; 10) → 952,38. Invariantes: retorno 0 → final = inicial +
Σentradas − Σsaídas (exato); nominal deflacionado ≡ real; FV_begin = FV_end×(1+i);
evento dez ≠ jan (motor mensal de verdade); Σ aportes do idealPlan ≤ sobra.
