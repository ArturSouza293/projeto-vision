# TESTING.md — relatório consolidado pré-deploy (Gate C)

> Branch `feature/vision-engine` · commits `f3607a0` (engine v0 revisado) →
> `5038d84` (inventário + golden) → `6ba36c2` (integração).
> **Nada foi enviado ao remoto. Produção no Vercel intocada.**
> Tudo abaixo rodou em localhost (build de produção, `next start -p 3010`).

## 1 · Motor (Fase A) — 129 testes verdes + bench

| Bloco | Resultado |
|---|---|
| Âncoras canônicas HP-12C/Excel (tol. rel. 1e-6) | ✅ 12% a.a.→0,948879% a.m. · Fisher 10%/4%→5,76923% · FV 12.682,50 / antecipada 12.809,33 · PV Price 166.791,61 · SAC 1.000/2.200/1.010/saldo 0 · growing g=r 952,38 |
| Invariantes | ✅ retorno 0 → final = inicial + Σentradas − Σsaídas (exato) · nominal deflacionado ≡ real ano a ano · FV_begin = FV_end×(1+i) · evento dez ≠ jan (motor mensal) · roundtrips TVM nas 5 variáveis |
| Property-based (50 cases, seed fixa) | ✅ Σ aportes do idealPlan ≤ sobra · 3 obrigatórios sempre presentes · sucessão ≥ 0 · determinismo · case parcial sem exceção |
| Bench (`npm run bench`) | ✅ **0,358 ms**/`project()` de 65 anos (780 meses) + 20 eventos + 10 despesas + 2 passivos — gate < 5 ms |

### Revisão adversarial multi-agente (30 agentes) — todos os achados corrigidos
2 P0 (serviço de dívida na desacumulação não saía do patrimônio; `mesesPorAno<12`
ignorado), 7 P1 (gap de aposentadoria estático; capital de preservation
inconsistente com a mecânica mensal; lookup de protótipo → NaN; ano cru vs
idade clampada; janela de datas admitia o ano-base; flags decorativas; doc do
alvo percentual) e 6 P2 (TOCTOU por getter no validador; resumo nominal
parcial; flag em compra financiada; duplo default de anoBase; contratos de
doc). Cada um tem regressão em `engine/__tests__/review-fixes.test.ts`.

## 2 · Paridade (Fase B) — golden values

`npm run golden:check` → 3 cases de referência (Camila & Diego, Fernanda +
eventos + financiamento, Marcos sobra negativa) **dentro de ±R$1/±0,1%**,
exceto **7 deltas legítimos** da migração anual→mensal — documentados em
[PARITY_NOTES.md](PARITY_NOTES.md) e **pinados** em
`golden/accepted-deltas.json` (o valor novo vira referência; regressão futura
nesses caminhos volta a falhar). Maior delta: −2,6% (saques mensais vs saque
anual único). Probabilidade, duração, espólio, objetivos, checkpoints 70/100 e
heurística do Plano Ideal: **zero delta** (KPIs mantêm a convenção anual, com
a aritmética no engine/mathcore).

## 3 · Regressão funcional + edge cases (`node golden/regression.mjs`) — 33/33

| # | Check | Resultado |
|---|---|---|
| A | 4 personas (Camila, Fernanda, Marcos, José Carlos ~aposentadoria): workspace sem NaN, KPIs presentes, wizard perfil→objetivos completo, console limpo | ✅ |
| A | Sobra negativa (Marcos) exibida com clareza | ✅ |
| B1 | Evento: drop muda números · **ghost visível DURANTE o drag** · some no drop · arrastar de volta restaura | ✅ |
| B2 | Valor extremo (R$ 999.999.999) sem NaN | ✅ |
| B3 | Drag da aposentadoria recalcula ao vivo | ✅ |
| B4 | Timeline lotada: 23 eventos renderizando | ✅ |
| B5 | **61 fps** medidos durante o drag com a timeline lotada (gate ≥ 45; alvo 60) | ✅ |
| B6 | 100 recálculos seguidos: heap estável com GC forçado (sem leak) | ✅ |
| C1 | Plano Ideal ponta a ponta com **API real**: racional-template exibido com slots, sem NaN, **aporte aplicado ≤ sobra** | ✅ |
| D1 | Wizard abandonado no meio → reabre com dados preservados | ✅ |
| * | Console 100% limpo em todos os cenários | ✅ |

## 4 · Regra Zero — auditoria

1. **Validador**: testes positivos/negativos + payloads maliciosos (campos
   monetários, percentuais, números em strings, ids falsos, flags
   desconhecidas, TOCTOU por getter, prototype-poisoning, datas fora da
   janela) — todos rejeitados (`validator.test.ts` + `review-fixes.test.ts`).
2. **Grep final no diretório de UI** (`components/`):
   `Math.pow|*(1+|/12|Math.exp` → restam apenas o easeOutCubic da ANIMAÇÃO dos
   sliders (não-financeiro) e zero divisões/juros — critério atendido.
3. **Fluxo online real**: a rota agora pede proposta ESTRUTURAL; o teste C1
   exercitou a API de verdade → proposta → validador → `engine.idealPlan` →
   sliders clampados; o racional na tela é template i18n com números do motor.
4. **Por construção**: o front não tem mais acesso a número algum da LLM — a
   resposta da API só carrega `{proposta}` (estrutura), e qualquer campo fora
   da whitelist invalida a proposta inteira (cai no plano determinístico).

## 5 · Deltas e pendências conhecidas

- Os 7 deltas do PARITY_NOTES (capitalização mensal) — **esperados e mais
  corretos** que o loop anual; visíveis como ~+0,8% no patrimônio projetado da
  Camila (R$ 1,244mi → 1,255mi).
- **Racional da BIA mudou de redação livre da LLM para template** com números
  do motor — única mudança de comportamento visível, exigida pela Regra Zero.
- IRRF/INSS continuam em `lib/premises.ts` (tabelas de premissa com fonte/ano,
  sem juros) — decisão documentada no INVENTORY.
- Jornada "cliente novo do zero" completa: coberta no ROTEIRO_TESTE_MANUAL
  (a parte crítica — abandono sem perda de dados — está automatizada).
- BACKLOG.md guarda as melhorias NÃO implementadas (regra da Fase B).

## Como reproduzir

```bash
npm test                    # 129 engine + 1 golden parity
npm run bench               # < 5 ms
npm run build && npx next start -p 3010
node golden/smoke.mjs       # smoke rápido
node golden/regression.mjs  # bateria completa (33 checks)
```
