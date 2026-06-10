# Vision Engine — Especificação Técnica de Reconstrução

> **Propósito deste documento:** permitir que um time técnico **reconstrua do
> zero** o motor de cálculo do Vision Financial Planning (e a sua integração no
> protótipo) sem acesso ao código original. Tudo que é decisão de arquitetura,
> fórmula, convenção, algoritmo, contrato e teste-âncora está aqui.
> Código de referência vivo: repositório `projeto-vision`, branch
> `feature/vision-engine`, pasta `engine/` (commits `f3607a0` → `a8f54ed`).
>
> ⚠️ **Valores ilustrativos.** As premissas numéricas validam FUNCIONALIDADE;
> não são certificadas fiscal nem atuarialmente. CET fora do escopo.

---

## 1 · Visão geral e princípios

O motor é um **pacote TypeScript puro** (zero dependência de UI, de framework e
de I/O), composto de **funções puras e stateless**. Ele é a **única fonte de
aritmética financeira do aplicativo** — nenhum componente de tela calcula juro,
projeção ou meta (ver §10, Regra Zero, e §11, adapter).

```
engine/
├── types.ts          # modelo de dados (contratos)
├── assumptions.ts    # premissas default + resolução (PREMISSAS ILUSTRATIVAS)
├── mathcore.ts       # TVM 5 variáveis, conversões, Fisher, growing annuities
├── amortization.ts   # Price e SAC (mensal, taxa efetiva)
├── rules.ts          # regras Vision: sobra, reserva, sucessão, aposentadoria
├── projection.ts     # loop mensal → saída anual (núcleo)
├── solve.ts          # solveGoal: PMT p/ alvo + ano viável por bisseção
├── ideal.ts          # idealPlan determinístico (aceita proposta da BIA)
├── validator.ts      # Regra Zero: whitelist da proposta da LLM
├── case-store.ts     # CaseStore em memória (casos por ID, cópias defensivas)
├── index.ts          # contrato público `engine: PlanningEngine`
└── __tests__/        # âncoras CFP, invariantes, property-based, regressões
```

**Princípios inegociáveis:**
1. Pureza/determinismo: mesma entrada → mesma saída, sempre (sem `Date.now()`
   no caminho de cálculo; `anoBase` vem do chamador).
2. Precisão total internamente; **arredondamento só na exibição** (C10) — o
   front tem UM helper de formatação (`lib/format.ts`).
3. Tolerância a caso parcial: arrays vazios e campos ausentes caem em defaults
   documentados — nunca exceção.
4. Performance: `project()` de 65 anos (780 meses) com 20 eventos < **5 ms**
   (medido: ~0,36 ms). Permite recálculo por frame durante drag (60 fps).

## 2 · Contrato público

```ts
interface PlanningEngine {
  project(c: PlanningCase): Projection;
  solveGoal(c: PlanningCase, goalId: string): GoalSolution;
  idealPlan(c: PlanningCase, proposta?: BiaProposal): PlanParameters; // proposta JÁ validada
  solveTVM(q: TVMQuery): number;
}
// + createCaseStore(): { createCase/getCase/updateCase/deleteCase/listCases }
// + validateBiaProposal(raw: unknown, c: PlanningCase): {ok,proposal}|{ok:false,errors}
```

## 3 · Convenções CFP obrigatórias (C1–C10)

| # | Convenção | Especificação exata |
|---|---|---|
| **C1** | Granularidade mensal | Loop interno mês a mês; saída agregada por ano-calendário. Eventos têm `mes` 1–12 (default 1). 13º/bônus/PLR são fluxos no MÊS real (13º = pagamento extra em dezembro via `mesesPorAno: 13`; `mesesPorAno < 12` paga só nos primeiros N meses do ano). |
| **C2** | Taxa efetiva composta (BR) | `i_m = (1+i_aa)^(1/12) − 1`. **PROIBIDO** `i_aa/12` (APR americano). Conversão genérica: `(1+i)^(de/para) − 1`. |
| **C3** | Fisher exato | `real = (1+nominal)/(1+inflação) − 1`. **PROIBIDA** a subtração. |
| **C4** | Moeda constante default | `modoProjecao: "real"` → taxas reais + valores de hoje. Modo `"nominal"` = transformação de Fisher aplicada em **UM único ponto** (na saída, função `inflateProjection`), o que torna misturar bases estruturalmente impossível. Fator do ano `a`: `(1+inflação)^(a − anoBase + 1)` (convenção fim-de-ano). **Todos** os campos monetários do resumo são inflados com a MESMA âncora da aposentadoria (`fator(anoAposentadoria−1)`) — o veredito financiado/deficitário tem que ser idêntico nos dois modos (invariante testada). |
| **C5** | Timing BEG/END | Séries suportam `timing: "end"|"begin"` (HP-12C). Default do app: `"end"`. Identidade: `FV_begin = FV_end × (1+i)`. |
| **C6** | Crescimento real por item | Rendas e despesas têm `crescimentoRealAA` (default 0), aplicado em degraus anuais: `fator = (1+g)^(anoIdx)`. PV/FV de anuidade crescente incl. caso `g = r`: `PV = n·C/(1+r)`. |
| **C7** | Retorno geométrico | Projeções compostas com média geométrica. Nota de calibração no arquivo de premissas: `μ_geo ≈ μ_arit − σ²/2` (volatility drag — relevante para o Monte Carlo v2). |
| **C8** | Aposentadoria, 3 métodos | `depletion` (default, conta centenária: PV de anuidade real mensal até `longevidadeAnos: 100`), `preservation` (vive dos rendimentos reais do mês), `perpetuity` (capital = `gapMensal / i_m` — perpetuidade na MESMA granularidade mensal da desacumulação). INSS (flag) **abate** a renda-alvo. |
| **C9** | Amortização BR | Price e SAC com taxa **efetiva** mensal (derivada por C2). CET fora de escopo — rotular "juros efetivos, sem CET". |
| **C10** | Arredondamento | Só na exibição. O motor entrega `number` em precisão total. |

## 4 · Modelo de dados (contratos completos)

```ts
// ----- entrada -----
PlanningCase {
  id?: string
  profile:  { idadeAtual: number; idadeConjuge?: number;
              dependentes?: {idade:number}[]; idadeUsufruto: number }
  incomes:  { recorrentes: RendaRecorrente[]; eventosUnicos?: EventoUnico[];
              rendaAposentadoria?: RendaAposentadoria }
  expenses: { itens: Despesa[] }
  assets:   { itens: Ativo[] }
  liabilities: { itens: Passivo[] }
  goals:    Goal[]            // SEMPRE contém os 3 obrigatórios (ver §8)
  lifeEvents?: EventoDeVida[] // modelo da timeline, + mes
  planParams?: { aporteMensal?: number; retornoRealAAOverride?: number }
  assumptions?: Partial<Assumptions>
}

RendaRecorrente { nome?; valorMensal; crescimentoRealAA?; ateAno?;
                  mesesPorAno?       /* 12 default; 13 = 13º em dezembro;
                                        <12 = paga nos N primeiros meses */
                  continuaNaAposentadoria? /* aluguel/previdência privada */ }
EventoUnico     { nome; valor; ano; mes? /*1–12, default 1*/; recorrenciaAnos? }
RendaAposentadoria { modo: "percentual"|"valor"; valor;
                     flagINSS: boolean; valorINSSMensal? /* o motor NUNCA inventa INSS */ }
Despesa  { nome; valorMensal; classe: "essencial"|"discricionaria";
           crescimentoRealAA?; ateAno? }
Ativo    { nome; valor; classe: "liquidez"|"previdencia"|"seguro"|"imovel"|"exterior"|"outros";
           retornoRealAA? /* default por classe nas premissas */ }
Passivo  { nome; sistema: "PRICE"|"SAC"; taxaEfetivaAA; prazoMeses; saldoDevedor; garantia? }
Goal     { id; tipo: "reserva"|"aposentadoria"|"sucessao"|"outro"; nome?;
           valorAlvo? /* obrigatórios podem omitir: motor deriva */;
           anoAlvo?; valorAtual?; aporteMensal?; prioridade?: "alta"|"media"|"baixa" }
EventoDeVida { id; tipo: "entrada"|"saida"; valor; ano; mes? /*default 1*/;
               recorrente?; anoFim? /* recorrente SEM anoFim = one-off (documentado) */ }

// ----- premissas (assumptions.ts — "PREMISSAS ILUSTRATIVAS — decisão de negócio") -----
Assumptions {
  anoBase: number                       // SEMPRE fornecido pelo adapter (determinismo)
  inflacaoAA: 0.04
  retornosReaisAA: { conservador: 0.03, moderado: 0.045, agressivo: 0.06 }
  perfilRetorno: "moderado"
  retornoRealPorClasse: { liquidez:0.02, previdencia:0.04, seguro:0,
                          imovel:0, exterior:0.045, outros:0 }
  longevidadeAnos: 100
  multiplicadorReservaDefault: 6        // 6 | 12
  percentualSucessao: 0.20
  timingAportes: "end"
  modoProjecao: "real"
  metodoAposentadoria: "depletion"
}
// resolveAssumptions(case) = deep-merge do parcial sobre os defaults.

// ----- saída -----
Projection {
  anos: LinhaAnual[]   // {ano, idade, entradas, saidas, saldoCaixa, patrimonio, fase}
                       // entradas INCLUI saques do patrimônio na desacumulação
  flags: { anosNegativos: number[] }
  resumo: { patrimonioInicial, patrimonioNaAposentadoria, patrimonioFinal,
            anoAposentadoria, duracaoAposentadoriaAnos, idadeEsgotamento|null,
            capitalNecessarioAposentadoria, rendaAlvoMensalLiquida }
  assumptionsUsadas: Assumptions
}
GoalSolution  { goalId, aporteNecessarioMensal /* nMeses≤0 → degenera p/ shortfall
                à vista, documentado */, aporteClampedMensal, anoViavel|null,
                viavelComSobra, valorAlvo, valorProjetadoNoAlvo }
PlanParameters{ aporteMensalTotal, alocacoes:[{goalId,tipo,aporteMensal}],
                idadeAposentadoria, retornoRealAA, inflacaoAA,
                metodoAposentadoria, multiplicadorReserva, sobraMensal,
                racionalSlots: Record<string, number|string> }
TVMQuery      { n?, i?, pv?, pmt?, fv?, timing? }  // exatamente UMA ausente
BiaProposal   { ordemPrioridade?: string[]            // ids de goals do case
                datasAlvo?: Record<goalId, anoInteiro> // janela [anoBase+1, anoBase+80]
                multiplicadorReserva?: 6|12
                metodoAposentadoria?: enum
                flags?: { considerarINSS?: boolean } } // SÓ flags honradas existem
```

## 5 · mathcore — algoritmos

**Identidade TVM (HP-12C, sinais: saídas negativas):**
```
pv·(1+i)^n + pmt·(1 + i·s)·[((1+i)^n − 1)/i] + fv = 0      s = begin?1:0
```
- `fv`, `pv`, `pmt`: resolvidos em forma fechada (com fast-path `|i| < 1e-12` →
  fator = n).
- `i` e `n`: **bisseção robusta** — (1) varredura de 400 passos no intervalo
  (`i ∈ [−0,9999, 10]`, `n ∈ [0, 12000]`) procurando troca de sinal do resíduo;
  (2) bisseção até `1e-12`; sem bracket → erro explícito.
- Validação: exatamente UMA variável ausente, senão `throw`.

**Anuidades de conveniência (magnitudes ≥ 0):** `fvAnnuity(pmt,i,n,timing)`,
`pvAnnuity(pmt,i,n,timing)`; growing annuity:
`PV = (C/(r−g))·(1 − ((1+g)/(1+r))^n)`, caso `|r−g|<1e-12` → `PV = n·C/(1+r)`;
`FV = PV·(1+r)^n`; timing begin multiplica por `(1+r)`.

## 6 · amortization — Price/SAC

- `pricePayment(P, i_m, n) = P·i_m / (1 − (1+i_m)^−n)`; taxa 0 → `P/n`.
- SAC: `amort = P/n` constante; `parcela_k = amort + saldo_{k−1}·i_m`;
  `saldo_{k−1} = P·(1 − (k−1)/n)`.
- `liabilityPaymentAt(passivo, k)`: parcela do mês k (1-based) do prazo
  REMANESCENTE; 0 fora do prazo. `i_m` derivada de `taxaEfetivaAA` por C2.

## 7 · projection — o loop mensal (núcleo)

Pseudocódigo fiel (a implementação real está em `engine/projection.ts`):

```
a = resolveAssumptions(case);  meses = (longevidade − idadeAtual)·12
retornoPlano = planParams.retornoRealAAOverride ?? retornosReaisAA[perfil]
buckets = ativos.map(item => { classe, valor, i_m(item.retornoRealAA ?? porClasse),
                               liquido: classe ∉ {imovel, seguro} })
        + bucket "plano" (valor 0, i_m do retornoPlano)   // recebe os aportes
aporteMensal = max(0, planParams.aporteMensal ?? sobraMensal(case))
eventosPorMes = indexa eventosUnicos (com recorrenciaAnos) e lifeEvents
                (recorrente+anoFim) por índice de mês: (ano−anoBase)·12 + mes−1
alvoBruto = rendaAlvoAposentadoriaBruta(case)     // §8

para cada mês m:
  ano, mesDoAno, idade;  fase = idade < idadeUsufruto ? acumulação : desacumulação

  // ENTRADAS — rendas do mês, honrando ateAno, (1+g)^anoIdx e mesesPorAno;
  // na desacumulação só as `continuaNaAposentadoria` + INSS (se flagINSS).
  // `continuaMes` acumula o que continua fluindo (gap dinâmico, NUNCA snapshot).

  // SAÍDAS — acumulação: despesas (ateAno, growth); desacumulação: alvoBruto
  // (a renda-alvo SUBSTITUI os itens de despesa). Sempre: parcelas dos passivos
  // (dividaMes) via liabilityPaymentAt(l, m+1).

  // EVENTOS — delta do mês: entrada soma em entradas; saída soma em saídas.

  // CRESCER + INVESTIR — timing begin: aporte antes do growth; cada bucket
  // valor *= (1+i_m); timing end: aporte depois. Evento entrada → bucket plano;
  // evento saída → sacar(buckets) na ordem liquidez→plano→outros→exterior→
  // previdência (imóvel/seguro NUNCA); shortfall → flag anosNegativos.

  // DESACUMULAÇÃO — gapMes = max(0, alvoBruto − continuaMes).
  // permitidoGap = gapMes (depletion) | min(gapMes, rendimentosDoMês) (pres/perp).
  // necessidade = dividaMes + permitidoGap   // dívida é SEMPRE financiada
  // sacado = sacar(necessidade); entradas += sacado.
  // sacado < dividaMes + gapMes → flag + (líquido zerado → idadeEsgotamento).

  // FLAG de déficit em acumulação: (entradas − eventosEntrada) − (saídas −
  // eventosSaída) < −0,005 → anosNegativos. Eventos EXCLUÍDOS (compra
  // planejada financiada não é problema; evento não-financiado já flagou acima).

  // FECHO DE ANO (mesDoAno == 12): agrega LinhaAnual; captura
  // patrimonioNaAposentadoria quando idade == idadeUsufruto − 1.

resumo: duração = idadeEsgotamento? esgotamento−usufruto : longevidade−usufruto;
capitalNecessário (§8); modoProjecao nominal → inflateProjection (C4).
```

**Decisões documentadas:** idade vira na virada do ano-calendário; déficit
recorrente de caixa NÃO é auto-financiado pelo patrimônio (flag apenas) —
eventos de vida SIM drenam; `recorrente` sem `anoFim` = one-off.

## 8 · rules — regras de negócio Vision

```
rendaMensalRecorrente  = Σ valorMensal·(mesesPorAno??12)/12
despesaMensalEssencial = Σ despesas classe "essencial"
servicoDividaMensal    = Σ 1ª parcela de cada passivo (Price/SAC, C9)
sobraMensal            = rendaRecorrente − despesasTotais − serviçoDívida

alvoReserva   = multiplicador(6|12) × despesaMensalEssencial
alvoSucessao  = max(0, percentualSucessao × patrimônioBruto − previdência − seguros)

rendaAlvoAposentadoriaBruta = modo "valor" ? valor
                            : (valor%)·rendaMensalRecorrente   // % da renda ATUAL
                            (sem rendaAposentadoria → 70% default, ilustrativo)
rendaContinuaAposentadoria  = INSS(flag·valorINSSMensal)
                            + Σ continuaNaAposentadoria (anualizada por mesesPorAno)
                            // estimativa ESTÁTICA para alvos; a projeção deriva
                            // o gap mês a mês dos fluxos reais (§7)
rendaAlvoMensalLiquida      = max(0, alvoBruta − contínua)

capitalNecessarioAposentadoria(método):
  depletion    → pvAnnuity(gapMensal, i_m, (longevidade − usufruto)·12, timing)
  preservation/perpetuity → gapMensal / i_m   (i_m ≤ 0 → +Infinity)
```

**Os 3 objetivos obrigatórios** (`reserva`, `aposentadoria`, `sucessao`):
`ensureMandatoryGoals` injeta os ausentes (`id auto-<tipo>`); invariante: todo
output de `idealPlan` contém os três. No app, nunca removíveis (cadeado).

## 9 · solve e ideal

**solveGoal(case, goalId):**
1. alvo = `valorAlvo` explícito ou derivado por tipo (reserva/sucessão/
   aposentadoria pelas regras §8); anoAlvo default por tipo (reserva: base+2;
   apos/sucessão: ano da aposentadoria; outro: base+10).
2. `PMT = solveTVM({n: meses, i: i_m, pv: −valorAtual, fv: alvo, timing})`,
   0 se o PV projetado já cobre. `nMeses ≤ 0` → shortfall à vista (contrato
   documentado; o validador impede a BIA de causar isso).
3. disponível = `max(0, sobra − Σ aportes dos OUTROS goals)`; clamp.
4. inviável → **ano viável por bisseção** sobre anos (PMT é decrescente em n):
   menor ano em `[anoAlvo, anoBase+80]` com `PMT(n) ≤ disponível`; nenhum → null.

**idealPlan(case, proposta?):** determinístico.
1. Aplica a proposta VALIDADA: método, multiplicador, reordenação
   (`ordemPrioridade` com lookup hasOwnProperty — imune a chaves herdadas),
   `datasAlvo`, flag `considerarINSS` (liga/desliga o abate do INSS).
2. Idade de aposentadoria proposta → **clampada** a `[idadeAtual+1,
   longevidade−1]`; o horizonte de funding do goal de aposentadoria usa SEMPRE
   o ano da idade clampada (nunca o ano cru).
3. Ordem default: reserva → aposentadoria → sucessão → demais (prioridade
   alta>média>baixa, desempate por id).
4. Aloca em cascata: `aporte_g = min(PMT_g, restante)`; `restante −= aporte_g`.
   **Invariante central (property-based, 50 cases): Σ aportes ≤ sobra.**
5. Saída inclui `racionalSlots` — os números que o front interpola no template
   do racional (Regra Zero §3).

## 10 · validator — Regra Zero (a LLM não calcula NADA)

A IA (BIA) só pode propor ESTRUTURA. Enforcement em camadas:

1. **Whitelist estrita** de chaves: `ordemPrioridade`, `datasAlvo`,
   `multiplicadorReserva` (6|12), `metodoAposentadoria` (enum), `flags`
   (somente `considerarINSS`, booleano). Chave desconhecida → proposta INTEIRA
   rejeitada (sem campos monetários/percentuais por construção).
2. **Hardening**: payload passa por `JSON.parse(JSON.stringify(raw))` na
   entrada (getters avaliados UMA vez → mata TOCTOU; funções/undefined somem;
   ciclo → rejeição); cada campo é lido UMA vez para variável local;
   `datasAlvo` reconstruída sobre `Object.create(null)`; consumo posterior usa
   `hasOwnProperty` (anti prototype-poisoning).
3. `ordemPrioridade`: cada item precisa ser EXATAMENTE um id de goal do case
   (membership bloqueia números contrabandeados em strings).
4. `datasAlvo`: ids existentes; ano INTEIRO na janela `[anoBase+1, anoBase+80]`
   (o próprio anoBase é rejeitado — n=0 viraria aporte à vista).
5. **Varredura final**: nenhuma string da proposta aceita pode conter dígito,
   exceto ids de goals já validados.
6. O racional exibido é **template i18n do app** interpolado com
   `racionalSlots` do motor — a LLM nunca redige um número.
7. Verificação contínua: grep `Math.pow|*(1+|/12|Math.exp` no diretório de UI
   (`components/`) deve achar somente easing de animação/formatação.

## 11 · Integração no app (adapter — `lib/engine/`)

O front NUNCA importa o motor diretamente nas telas. A ponte:

- **`lib/engine/adapter.ts`** — único ponto de troca.
  `projectInputViaEngine(input)` traduz o request legado do app para
  `PlanningCase` **preservando as semânticas de exibição v2**:
  - 1 bucket líquido único = riqueza investível, na taxa do CENÁRIO;
  - eventos de vida em `mes: 12` (o app v2 aplicava no fim do ano);
  - renda contínua de aposentadoria inteira pelo canal INSS (só flui na
    desacumulação, como antes);
  - `longevidadeAnos = horizonte(95) + 1` para a série anual cobrir
    idadeAtual..95 inclusive;
  - passivos NÃO entram na curva (paridade v2; serviço de dívida abate a sobra);
  - linha de renda do gráfico reconstruída sem os eventos (display).
  KPIs de anuidade (probabilidade-logística, lacuna de renda, % de objetivo)
  mantêm a convenção ANUAL — calculados com `engine/mathcore` (zero delta).
- **`lib/engine/plano-ideal-flow.ts`** — fluxo BIA completo:
  `idealViaEngine(plan, assumptions, propostaRaw?)` → valida → `idealPlan` →
  mapeia para os 4 sliders com clamp DUPLO (motor + limites do slider;
  aporte-manchete = alocação do motor − aportes já comprometidos nos goals,
  clampado a `sobra − aportesDosGoals`) → devolve `slots` para o template.
- **Paridade auditada**: golden values dos 3 cases de referência (captura
  pré-integração via o pipeline real do app); divergências só da classe
  anual→mensal, documentadas em `PARITY_NOTES.md` e **pinadas** em
  `golden/accepted-deltas.json` (cada delta aceito guarda o valor novo —
  regressão futura volta a falhar).

## 12 · Testes-âncora (a régua da reconstrução)

Tolerância relativa **1e-6** salvo indicado. Um motor reconstruído DEVE bater:

| Âncora | Esperado |
|---|---|
| 12% a.a. → mensal efetiva | 0,948879% a.m. |
| Fisher: nominal 10%, inflação 4% | real 5,76923% |
| FV (1.000/m; 1% a.m.; 12m) END | 12.682,50 |
| idem BEGIN | 12.809,33 (= END × 1,01) |
| PV Price (1.000/m; 0,5% a.m.; 360m) | 166.791,61 (tol. 0,01%) |
| SAC (120.000; 120m; 1% a.m.) | amort 1.000 · 1ª parcela 2.200 · última 1.010 · saldo final 0 |
| Growing annuity g=r (C=100; 5%; n=10) | PV 952,38 |

**Invariantes estruturais:** retorno 0 + inflação 0 → `final = inicial +
Σentradas − Σsaídas` (exato) · nominal deflacionado ≡ real ano a ano ·
`FV_begin = FV_end·(1+i)` · evento em dezembro ≠ janeiro (prova do motor
mensal) · roundtrip TVM nas 5 variáveis · `Σ aportes do idealPlan ≤ sobra` em
50 cases aleatórios (PRNG semeada) + 3 obrigatórios sempre presentes ·
sucessão ≥ 0 · determinismo (JSON igual em duas execuções) · case parcial sem
exceção · veredito financiado/deficitário idêntico em real × nominal ·
endividado ≠ sem-dívida na desacumulação · `mesesPorAno: 6` → 6.000/ano ·
payloads maliciosos da BIA rejeitados (monetários, números em strings, getters
TOCTOU, `__proto__`, datas fora da janela, flags desconhecidas).

**Gates de qualidade:** `npm test` 100% verde · `npm run bench` < 5 ms ·
`npm run golden:check` limpo · `node golden/regression.mjs` 33/33 (4 personas,
ghost ao vivo no drag, 60 fps com timeline lotada, heap estável em 100
recálculos com GC forçado, Plano Ideal com aporte ≤ sobra, console limpo).

## 13 · Armadilhas conhecidas (achados da revisão adversarial — não repita)

1. **Dívida na desacumulação**: contabilizar a parcela em `saidas` sem sacá-la
   dos buckets cria saída-fantasma — patrimônio superestimado pelo serviço de
   dívida inteiro. A dívida é SEMPRE financiada pelo portfólio na desacumulação.
2. **Gap de aposentadoria estático**: congelar `alvo − contínuas` antes do loop
   ignora `ateAno`/crescimento/13º que o próprio loop honra — derive o gap
   mês a mês de `continuaMes`.
3. **Perpetuidade anual vs mecânica mensal**: `gap·12 / i_aa ≠ gap / i_m`.
   Use a granularidade do saque (mensal).
4. **Nominal parcial**: inflar patrimônio e esquecer capitalNecessário/renda-alvo
   inverte o veredito de funding entre modos.
5. **Validador**: leia cada campo UMA vez (getters mentem na 2ª leitura);
   reconstrua objetos com protótipo nulo; janela de datas começa em anoBase+1.
6. **`mesesPorAno`**: módulos diferentes discordando do mesmo campo (rules
   anualiza, projeção ignora) = números inconsistentes. Uma semântica, dois
   consumidores.

## 14 · Roadmap técnico (v2 — fora do escopo v0)

Monte Carlo sobre o mesmo `PlanningCase` (usar C7 para calibrar μ_geo),
checkpoints probabilísticos 70/100 (VIS-803), CET nos passivos, multimoeda no
motor (hoje só no app), `solveTVM` para metas com growing-PMT, snapshot de
premissas por plano efetivado (VIS-1203).
