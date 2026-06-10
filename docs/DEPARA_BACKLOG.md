# De-Para — Backlog Ágil (13_backlog_agil_fp_PT) × Protótipo + Motor

> Mapeamento história a história entre o backlog funcional (v3, 13 épicos / 54
> histórias) e o que está **implementado** no repositório `projeto-vision`
> (branch `feature/vision-engine`). Serve de guia de paridade para o time:
> o que já tem referência viva no protótipo, o que está parcial e o que é novo.
>
> **Legenda:** ✅ implementado (referência viva) · 🟡 parcial (núcleo existe,
> aceites faltando) · ⚙️ pronto no MOTOR, sem UI · ❌ não implementado ·
> 🔮 fora do protótipo por design (O3/integrações).

## E1 — Perfil do Cliente e Família

| História | Status | Onde está / o que falta |
|---|---|---|
| VIS-101 perfil + idades-chave | 🟡 | `profile-step.tsx` (DOB, usufruto); usufruto vira default da aposentadoria (`defaultAssumptions`/`defaultGoals`). Falta: bloqueio explícito usufruto ≤ atual (hoje o motor clampa) e popup de propagação. |
| VIS-102 cônjuge + regime | 🟡 | `hasPartner`/`partnerName` no perfil. Falta: CPF com DV e regime de casamento. |
| VIS-103 dependentes | 🟡 | Dependentes com idade e `birthDate` (idade derivada — `dependentAge`). Falta: vínculo (filho/enteado/…) e âncora a objetivo. |
| VIS-104 salvar/listar/reabrir | ✅ | Persistência server-side Neon (`/api/scenarios`, payload JSONB completo) + autosave local (zustand persist); reabrir restaura telas/objetivos/timeline/parâmetros (testado: wipe de localStorage → restaura do banco). Isolamento por usuário. |

## E2 — Renda

| História | Status | Onde |
|---|---|---|
| VIS-201 rendas recorrentes c/ crescimento | 🟡⚙️ | Múltiplas rendas + sobra dinâmica ✅; `crescimentoRealAA` pronto no motor (C6), campo **não exposto na UI**. |
| VIS-202 eventos únicos (13º/PLR) c/ mês | 🟡⚙️ | UI tem "eventos únicos" de renda (sem mês); motor suporta `EventoUnico{ano,mes,recorrenciaAnos}` e `mesesPorAno: 13` (extra em dezembro) com teste. |
| VIS-203 renda na aposentadoria + INSS | ✅ | `retirementIncome {modo %/valor, inss}` na UI; INSS abate a renda-alvo (motor C8); teto INSS nas premissas editáveis. Pendência nº 6 respondida de facto: **abate**. |

## E3 — Despesas

| História | Status | Onde |
|---|---|---|
| VIS-301 categorias ampliadas | 🟡 | Categorias housing/living/health/education/lifestyle/debt/other ✅. Falta: subcategorias de cartão, IPVA/IPTU/IR como categorias próprias. |
| VIS-302 essencial × discricionária | ✅ | Flag `primary` por item; Reserva usa exclusivamente essenciais (motor `alvoReserva`). Pendência nº 1 respondida de facto: **base = essenciais**. |
| VIS-303 % comprometimento | 🟡 | Total ✅ (savingsRate/sobra, KPIs, alerta déficit/superalocação). Falta: % POR ITEM. |
| VIS-304 crescimento real por despesa | ⚙️ | Motor pronto (C6, `Despesa.crescimentoRealAA` + `ateAno`); sem UI (O2 — coerente). |

## E4 — Patrimônio e Passivos

| História | Status | Onde |
|---|---|---|
| VIS-401 ativos por classe | 🟡 | 9 classes incl. veículo/exterior/FGTS ✅ (composição na rosca); multimoeda com FX + titularidade ✅ (além do backlog!). Falta: tipo de imóvel e FGTS com data de uso entrando no fluxo. |
| VIS-402 passivos Price/SAC | 🟡⚙️ | UI: saldo, taxa, parcela informada, tipo, garantia (vínculo a bem ✅). Motor: Price/SAC completos com taxa efetiva (C2/C9) + âncoras de teste. Falta: UI derivar a parcela pelo motor quando não informada e mostrar o saldo decrescendo. |
| VIS-403 patrimônio líquido | ✅ | `netWorthTotals` em tempo real; PL negativo exibido neutro. |

## E5 — Objetivos de Vida

| História | Status | Onde |
|---|---|---|
| VIS-501 três obrigatórios | ✅ | `MANDATORY_GOAL_TYPES` + `withMandatoryGoals` (front) + `ensureMandatoryGoals` (motor, invariante property-based); cadeado + tooltip; auto-cura. |
| VIS-502 reserva 6/12 | ✅ | Multiplicador nas premissas editáveis (`emergencyReserveMonths`); alvo = mult × essenciais; BIA pode propor 6|12 (whitelist). |
| VIS-503 conta centenária + métodos | 🟡⚙️ | Motor: 3 métodos completos (C8) + capital necessário; longevidade 100 nas premissas. UI: depletion default; seletor de método **não exposto** (BIA pode propor via flag/proposta). |
| VIS-504 sucessão regra da casa | ✅ | `alvoSucessao = max(0, 20%×bruto − previdência − seguros)`; seguro de vida do perfil abate; nunca negativo. Pendência nº 2 respondida de facto: **bruto**. |
| VIS-505 objetivos personalizados | ✅ | Dropdown de tipos (não-obrigatórios), nome/valor/data/prioridade/aporte; entram na repartição da sobra. Falta: vínculo a dependente. |
| VIS-506 pré-preenchimento + propagação | 🟡 | Pré-preenchimento ✅ (`defaultAssumptions`, `defaultGoals`, alvos derivados). Popups de propagação ❌ (recálculo é ao vivo — modelo "motor dinâmico" substituiu parcialmente a necessidade). |
| VIS-507 cabeçalho-resumo | 🟡 | Tela de objetivos tem tiles Sobra/Alocado/Livre ✅; cabeçalho do workspace tem patrimônio/sobra ✅. Falta: idade × ano-alvo travado com destrave confirmado. |

## E6 — Linha do Tempo Dinâmica (assinatura)

| História | Status | Onde |
|---|---|---|
| VIS-601 paleta de eventos | ✅ | 11 presets + customizado (`life-event-meta.ts`); duração/recorrência ✅; valores default editáveis; mês no motor (UI assume ano). |
| VIS-602 arrastar com curva ao vivo | ✅ | `wealth-timeline.tsx`: ghost por rAF DURANTE o drag, commit no drop; **61 fps medidos** com 24 eventos; recálculo 0,36 ms; Regra Zero (números do motor). |
| VIS-603 reposicionar evento | ✅ | Drag de chip com snap por ano; vale se desloca; testado incl. "drag de volta restaura". |
| VIS-604 aposentadoria-âncora | ✅ | Âncora arrastável desloca a fronteira; aportes/indicadores ao vivo; clamp retMin/retMax. Falta: popup de propagação ao soltar. |
| VIS-605 objetivos na timeline | ❌ | Objetivos não aparecem na linha (só eventos). Motor pronto para alimentar tooltips. |
| VIS-606 drag de data-alvo (inverse-solve) | ⚙️ | Motor `solveGoal` (PMT + ano viável por bisseção) pronto e testado; UI ❌. |
| VIS-607 eventos pós-aposentadoria | ⚙️ | **Motor já projeta eventos em qualquer fase** (desacumulação saca/estende); a UI v1 clampa o drop à acumulação (`clampEventYear`) — remover a trava + eixo até 100. |
| VIS-608 vínculo evento↔objetivo | ❌ | Não implementado. |
| VIS-609 undo + teclado | 🟡 | Teclado ✅ (←/→ ±1/±5, Enter, Delete) + editor numérico de ano ✅. Ctrl+Z/histórico ❌ (drag inverso funciona como undo manual). |

## E7 — Projeção e Sinais Vitais

| História | Status | Onde |
|---|---|---|
| VIS-701 fluxo visível no topo | 🟡 | Workspace: curva + Renda vs Necessidades + KPIs sempre visíveis ✅. Wizard: tiles na aba objetivos; não há painel persistente em TODAS as etapas. |
| VIS-702 projeção com fases | ✅ | Horizonte até o limite do plano; fronteira de aposentadoria marcada; campo `fase` do motor; esgotamento sinalizado (duração/KPIs). Falta: sombreado visual por fase. |
| VIS-703 painel de sinais vitais | ✅ | 6 KPIs clicáveis (patrimônio, renda dura, probabilidade, espólio, lacuna, objetivos N/M) com modal de detalhe; estados semânticos. |
| VIS-704 real × nominal | 🟡⚙️ | Motor C4 completo (modo nominal = transformação única, inviável misturar, invariante testada). Toggle de UI ❌ (default real em tudo). |

## E8 — Parâmetros do Plano

| História | Status | Onde |
|---|---|---|
| VIS-801 aporte ≤ sobra, idade travada | ✅ | Slider de aporte com teto = sobra; `idealBounds` (retMin/retMax do perfil); invariante Σ ≤ sobra testada no motor (50 cases). |
| VIS-802 perfis de retorno + premissas | ✅ | Cenários Base/Cauteloso/Conservador/Estressado + personalizado; premissas com fonte/ano em diálogo editável (INSS, IRRF, retorno, inflação, longevidade, reserva, sucessão). |
| VIS-803 checkpoints 70/100 | 🟡 | Versão DETERMINÍSTICA implementada (marcas 70%/100% no slider de retorno, por bisseção sobre o motor). Monte Carlo (semântica probabilística) = motor v2, conforme onda O2. |
| *(sem id)* múltiplos cenários | ✅ | **Não está no backlog**: criar/duplicar/selecionar/comparar N cenários por cliente — ver backlog revisado (VIS-804). |

## E9 — Plano Ideal com IA (BIA)

| História | Status | Onde |
|---|---|---|
| VIS-901 um clique | ✅ | Botão → proposta ESTRUTURAL da BIA → validador whitelist → `engine.idealPlan` → sliders animam; sempre viável (clamp duplo); proposta fora do schema → plano determinístico. |
| VIS-902 racional simples | ✅ | Card "Racional da BIA" = template i18n interpolado com slots do motor (Regra Zero §3 estrito — a LLM não redige nem o texto numérico). |
| VIS-903 antes→depois + regenerar | 🟡 | Animação current→ideal mostra a transição ✅; regenerar ✅; ajustes manuais preservam clamp ✅. Falta: diff explícito por parâmetro (valor antigo → novo). |
| VIS-904 modo sem IA | ✅ | Sem chave/timeout/erro → mesmo fluxo determinístico do motor com badge "modo offline"; mesmo formato de saída. |
| VIS-905 privacidade por construção | ✅ | `buildPlanoIdealPayload` só números/booleans anonimizados (ids de objetivos não-identificáveis); validador testado com payloads maliciosos. Falta: teste automatizado específico "payload com nome/CPF barrado" (a anonimização é por construção — não há campo PII no payload). |

## E10 — Engajamento

| História | Status | Onde |
|---|---|---|
| VIS-1001 aba do porquê | ✅ | `why-plan.tsx`: 4 cards com o conteúdo aprovado, antes do wizard, puláveis; textos em `messages/*.json` (config sem código, deploy ainda necessário). |
| VIS-1002 pitch por segmento | ✅ | Seletor Retail/Prime/Principal/Private com exemplo FV dinâmico (calculado pelo MOTOR — `monthlyPmtForTarget`). Já entregue na O1. |
| VIS-1003 CTA começar | ✅ | "Começar meu plano" → wizard. Falta: variante "continuar meu plano". |

## E11 — Sessão do Advisor

| História | Status | Onde |
|---|---|---|
| VIS-1101 tela compartilhada | ✅ | Layout 1080p legível (validado na demo gravada); números-chave em destaque. Auditoria AA formal ❌. |
| VIS-1102 sem perda de dados | ✅ | Autosave (zustand persist) + Neon; wizard abandonado no meio preserva (teste automatizado D1); recuperação pós-fechamento ✅. |
| VIS-1103 efetivação explícita | 🟡 | Fase "Entrega" (Output) com aprovação → oportunidades → payload de saída (mock Salesforce). Falta: badge "simulação" e semântica de efetivação definitiva. |
| VIS-1104 pré-preenchimento do banco | 🔮 | Fora do protótipo (O3). Simulado pelos 6 dossiês seed ("recebidos do banco"). |

## E12 — Confiança e Conformidade

| História | Status | Onde |
|---|---|---|
| VIS-1201 origem única (Regra Zero) | ✅ | Motor determinístico + validador + grep de aritmética em UI limpo + testes positivos/negativos. Falta: o grep como gate de CI (hoje roda na bateria local). |
| VIS-1202 selo ilustrativo + premissas | 🟡 | Premissas visíveis/editáveis com fonte/ano em 1 clique ✅. Selo "valores ilustrativos" permanente nas telas ❌ (existe na documentação). |
| VIS-1203 snapshot por plano | 🟡 | O payload salvo no Neon leva o plano INTEIRO incl. premissas da época (snapshot de facto). Falta: versionamento explícito + aviso "premissas mudaram" ao reabrir. |

## E13 — Resultado e Report

| História | Status | Onde |
|---|---|---|
| VIS-1301 resumo do plano | 🟡 | Tela Output: aprovação, oportunidades de cross-sell ranqueadas e pacote JSON de saída. Falta: resumo de 1 página imprimível para o CLIENTE com selo/premissas. |
| VIS-1302 report por persona | ❌ | O3 — não implementado. |

## Implementado SEM história no backlog (gaps de cobertura → backlog revisado)

| Funcionalidade existente | Proposta de história |
|---|---|
| Login leve do advisor + biblioteca de casos por usuário + personas seed | VIS-105/106 (novo) |
| **Múltiplos cenários** por cliente (criar/duplicar/comparar) + modo dinâmico | VIS-804/805 (novo) |
| Questionário de **suitability** (5 perguntas → score → perfil → flags) | VIS-806 (novo) |
| **Copilot conversacional** (chat BIA com contexto do plano + "Pergunte à Bia" nos KPIs) | VIS-906/907 (novo) |
| **Cross-sell engine** (oportunidades ranqueadas por sinais do plano) | VIS-1304 (novo) |
| **i18n** EN/PT-BR com toggle ao vivo | VIS-1105 (novo) |
| Enriquecimento: multimoeda/FX, titularidade, financiamento↔bem, seguro de vida → sucessão | VIS-404 (novo) |
| Motor de cálculo em si (mathcore/projeção/regras/solvers/validador/case-store/testes/bench/paridade) | ÉPICO E14 (novo, 8 histórias) |
| Pipeline de demo (vídeo 36s automatizado) | Ferramenta interna — fora do backlog de produto (documentada no README) |

## Pendências de negócio — estado de facto no protótipo

1. Base do multiplicador da reserva: **essenciais** (implementado assim).
2. Sucessão: **20% do BRUTO**, previdência+seguros abatem o alvo (implementado).
3. Checkpoints 70/100: hoje DETERMINÍSTICOS (70% = probabilidade-logística;
   100% = funding dos 3 prioritários) — semântica probabilística fica p/ motor v2.
4. Reserva arrastável: não implementado (sem flag ainda).
5. Funding pós-usufruto: aportes cessam no usufruto (implementado assim no motor).
6. INSS: **abate** a renda-alvo (implementado; teto editável nas premissas).
