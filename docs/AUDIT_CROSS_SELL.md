# AUDIT — Eventos da Timeline e Plano → Oportunidades de Cross-sell (v7 · Parte A)

> Auditoria de cobertura ANTES de qualquer implementação (spec v7).
> Fontes lidas: `lib/cross-sell.ts` (motor de sinais), `lib/output.ts` (payload
> CRM), `components/engine/output.tsx` (tela), `lib/life-event-meta.ts`
> (presets), `lib/types.ts` (CrossSellOpportunity).
>
> **Conclusão central: `generateOpportunities(plan)` consome fluxo de caixa,
> balanço, perfil, segmento e OBJETIVOS — mas NUNCA lê `plan.lifeEvents`.
> A linha do tempo inteira (11 presets + custom + pós-aposentadoria) é
> invisível para o cross-sell hoje.**
>
> Legenda: ✅ coberto · 🟡 parcial · ❌ ausente.

## 1 · Eventos da timeline → sinais (B1) — TODOS AUSENTES

| Fonte (preset) | Sinal a derivar (spec B1) | Categoria | Status | Ref |
|---|---|---|---|---|
| `property_sell` (entrada 600k) | Alocação da entrada (parking → carteira por suitability) | reserve/investments | ❌ | nenhuma leitura de lifeEvents em cross-sell.ts |
| `inheritance` (entrada) | Alocação da entrada + previdência/sucessão se objetivo Sucessão tem gap | investments + wealth | ❌ | idem |
| `bonus` (entrada) | Alocação da entrada (sujeito a limiar) | investments | ❌ | idem |
| `property_buy` (saída 600k) | Poupança programada via `solveGoal` até a data; perto + não cabe na sobra → financiamento planejado | goals / credit | ❌ | idem (motor `solveGoal` pronto: engine/solve.ts) |
| `car` (saída) | Poupança programada / consórcio | goals / credit | ❌ | idem |
| `renovation` (saída) | Poupança programada | goals | ❌ | idem |
| `wedding` (saída) | Poupança programada | goals | ❌ | idem |
| `business` (saída) | Funding + **proteção** (renda mais volátil) | goals + protection | ❌ | idem |
| `travel` (saída) | Câmbio/conta internacional SOMENTE ≥ limiar | international | ❌ | idem |
| `education` (saída recorrente) | Previdência/instrumento de educação, racional citando horizonte longo | goals/retirement | ❌ evento (objetivo ver §2) | idem |
| `child` (saída recorrente) | Proteção/planejamento familiar | protection | ❌ | idem |
| `custom` | Cair nas famílias acima por tipo/valor/fase — nunca ignorar | (conforme) | ❌ ignorado silenciosamente | idem |
| Evento PÓS-aposentadoria (VIS-607, habilitado na v6) | Renda programada/revisão de desacumulação citando `anoEsgotamento` | retirement | ❌ | motor pronto: `summarize().anoEsgotamento` (engine/summary.ts) |
| Evento com `goalId` (vínculo v5) | Dedupe: UMA oportunidade (evento+objetivo) | — | ❌ | campo existe (types.ts), ninguém consome |

## 2 · Elementos do plano → sinais (B2)

| Fonte | Sinal | Categoria | Status | Ref |
|---|---|---|---|---|
| Déficit OU dívida ≥ 90% a.a. | Reestruturação de dívida | credit | ✅ manter | cross-sell.ts:78 |
| Dependentes (+ provedor único) | Seguro de vida | protection | ✅ manter | :81 |
| Saúde ≥ 2k + dependentes | Fundo médico | protection | ✅ manter | :84 |
| Líquido < 3 meses de despesa | Reserva | reserve | ✅ manter (nota: 3 meses hardcoded; premissa da casa = 6 editável — observação, fora do escopo v7) | :87 |
| Caixa parado > 50k | Migração de caixa | investments | ✅ manter | :90 |
| Sem previdência + (PJ ∨ renda > 240k) | Previdência | retirement | ✅ manter | :93 |
| Perto da aposentadoria | Escada de renda | retirement | 🟡 idade/ano-alvo apenas; **não usa método × `anoEsgotamento` do motor** (B2) | :96 |
| Objetivo education | Instrumento de educação | goals | 🟡 dispara pelo objetivo, mas racional não cita horizonte; **sem dedupe com evento**; valor = alvo bruto (sem gap/aporte `solveGoal`) | :99 |
| Objetivo property | Crédito imobiliário | credit | 🟡 idem (sem aporte programado) | :102 |
| **Objetivo descoberto sem funding (gap > 0 / fundedPct < 90)** | Aporte programado dimensionado por `solveGoal` | goals | ❌ | goalFunding existe (motor) — não consumido aqui |
| Hipoteca | Revisão de financiamento | credit | ✅ manter | :105 |
| Principal/Private + investível | Offshore | international | ✅ manter | :108 |
| Segmento private | Sucessão | wealth | 🟡 só segmento; **não usa `alvoSucessao`/gap do motor nem titularidade concentrada** (B2) | :111 |
| **Suitability × alocação implícita divergente** | Realocação | investments | ❌ | suitability.profile existe; composição por classe existe (`netWorthTotals.byClass`); nunca comparados |
| Sobra > 500 | Aporte automático | investments | ✅ manter | :114 |

## 3 · Pertinência e ranqueamento (B3)

| Regra do spec | Status | Ref |
|---|---|---|
| Limiar de relevância parametrizável (% da renda anual) | ❌ não existe | — |
| Janela temporal com decaimento (eventos próximos pesam mais) | ❌ score ignora datas | scoreFor (:20) só fit+log10(valor) |
| Dedupe evento↔objetivo (VIS-608) e consolidação multi-fonte por categoria | 🟡 dedupe por PRODUTO existe (:119); origens consolidadas ❌ | :119-123 |
| Teto M parametrizável + "ver todas" | 🟡 `slice(0, 6)` hardcoded; sem "ver todas" | :124 |
| Lista vazia honesta | ✅ manter (sem sinais → []) | estrutura do gerador |
| Score explicável (fatores com pesos visíveis) | 🟡 FIT_BASE + boost log são visíveis no código, mas sem fatores de proximidade/valor-relativo e o racional não expõe fatores | :18-23 |

## 4 · UI e payload (B4)

| Item | Status | Ref |
|---|---|---|
| Card com **origem do sinal** ("derivada do evento: X · ano") | ❌ `CrossSellOpportunity` não tem campo de origem | types.ts; output.tsx só renderiza produto/categoria/racional/fit/valor |
| `origemSinal` no JSON do CRM | ❌ | output.ts:65-72 |
| Racional por template i18n com slots numéricos | 🟡 racionais existem por chave i18n, porém SEM slots (texto fixo); spec pede slots do motor | messages crosssell.why.* |

## 5 · O que NÃO será tocado (já coberto e com comportamento validado)

Dívida cara, seguro de vida/provedor único, fundo médico, reserva, caixa parado,
previdência PJ, hipoteca, offshore, autoInvest, dedupe por produto, lista vazia
honesta. A Parte B estende por **composição** (novo derivador
`signalsFromEvents` + complementos B2 + camada de pertinência/ranqueamento),
sem reescrever essas regras.

## 6 · Prontidão do motor (nada de aritmética nova precisa nascer na UI)

Já existem e serão consumidos: `solveGoal` (aporte até a data do evento),
`summarize().anoEsgotamento` (B1.6), `goalFunding/fundedPct` (B2),
`alvoSucessao` (B2), `cashFlowTotals/netWorthTotals.byClass` (limiar % da renda
anual e suitability×alocação). Parametrização (limiar/janela/teto) entra em
configuração própria do módulo (espelho das `assumptions` — decisão de negócio
visível), não hardcoded.

---

# DEPOIS — matriz final de cobertura (Parte B implementada)

Parâmetros confirmados pelo usuário: **limiar 20% da renda anual · janela 5
anos com decaimento linear (peso mínimo 0,2) · consórcio/financiamento
planejado ofertável como categoria · teto de exibição 5** — tudo em
`lib/cross-sell-config.ts` (decisão de negócio visível).

| Item da auditoria | Antes | Depois | Onde |
|---|---|---|---|
| Eventos de ENTRADA (property_sell/inheritance/bonus/custom) | ❌ | ✅ `inflowParking` (+ `successionPlanning` quando herança × gap de sucessão) | `cross-sell-events.ts` B1.1 |
| Eventos de SAÍDA planejável (property_buy/car/renovation/wedding/custom) | ❌ | ✅ `plannedSavings` com aporte do motor (TVM, rota do solveGoal) OU `plannedFinancing` quando próximo e não cabe na sobra — nunca silêncio | B1.2 |
| Educação (evento e/ou objetivo) | 🟡 | ✅ UMA oportunidade consolidada com as duas origens; racional cita o horizonte | B1.3 + consolidação |
| Abrir negócio | ❌ | ✅ funding + `protectionReview` (renda volátil) | B1.4 |
| Viagem/câmbio | ❌ | ✅ `fxAccount` somente ≥ limiar (anti-spam testado) | B1.5 |
| Evento pós-aposentadoria | ❌ | ✅ `decumulationReview` citando `anoEsgotamento` do motor | B1.6 |
| Eventos custom | ❌ | ✅ caem nas famílias por tipo/fase/valor | B1.7 |
| Objetivo sem funding | ❌ | ✅ `goalFunding` com aporte do motor | B2.1 |
| Esgotamento projetado | ❌ | ✅ `decumulationReview` (consolida com B1.6) | B2.2 |
| Suitability × alocação | ❌ | ✅ `reallocation` (limiares na config) | B2.3 |
| Titularidade + sucessão | ❌ | ✅ `successionPlanning` (concentração > 70%) | B2.4 |
| Limiar de relevância | ❌ | ✅ 20% da renda anual (config) | B3 |
| Janela temporal | ❌ | ✅ decaimento linear 5 anos; score de evento = fit + proximidade + valor RELATIVO (sem duplicar o boost de valor absoluto) | B3 |
| Dedupe/consolidação | 🟡 | ✅ por produto, mesclando origens (máx. 3 listadas) | B3 |
| Teto + "ver todas" | 🟡 | ✅ teto 5 na EXIBIÇÃO; gerador devolve o ranking completo; payload leva tudo | B3/B4 |
| Lista vazia honesta | ✅ | ✅ preservada (testada) | regressão |
| Origem do sinal no card | ❌ | ✅ "derivada do evento/do plano: X · ano" | B4 (output.tsx) |
| `origemSinal` no JSON do CRM | ❌ | ✅ por oportunidade | B4 (output.ts) |
| Racionais com slots numéricos | 🟡 | ✅ templates ICU com {aporte}/{ano}/{anoEsgotamento} formatados por locale, EN/PT em paridade | messages |
| 10 regras existentes | ✅ | ✅ intactas (+ origem do plano), com testes de regressão | cross-sell.ts |

**QA:** 19 testes nomeados por regra (`lib/__tests__/cross-sell.test.ts`) ·
156 testes totais · golden de paridade INALTERADO (cross-sell não toca a
projeção, como exigido) · 7/7 checks de navegador na tela de Entrega
(screenshot `golden/v7_output.png`) · grep de aritmética em `components/`
limpo (a derivação vive em `lib/`).
