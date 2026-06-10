# 13 — Backlog Ágil do Vision Financial Planning (v4 — cobertura total do protótipo)

Projeto Vision · Business Analysis · PT · **14 épicos · 74 histórias** · IDs padrão
VIS-XXX · Complexidade indicação do BA (PP/P/M/G); story points do time, no
refinamento · Ondas: O1 paridade com o protótipo · O2 extensões · O3 evoluções.

**O que muda da v3 → v4:** (a) cada história ganhou **Status no protótipo**
(✅ implementado / 🟡 parcial / ⚙️ pronto no motor sem UI / ❌ a construir / 🔮 fora
do protótipo) com a referência viva — o de-para detalhado está em
`docs/DEPARA_BACKLOG.md`; (b) **20 histórias novas** cobrindo funcionalidades
que existem no protótipo e não estavam representadas (cenários múltiplos,
suitability, copilot, biblioteca de casos, i18n, cross-sell, enriquecimento
patrimonial) e o **ÉPICO E14 — Motor de Cálculo** (o motor agora é entregável
de primeira classe, com 9 histórias reconstruíveis por `docs/ENGINE_SPEC.md`);
(c) pendências de negócio anotadas com a resposta DE FACTO implementada.

> Convenção desta v4: histórias da v3 mantêm o texto integral do documento
> original (não repetido aqui — apenas título, onda, status e ajustes de
> aceite). Histórias NOVAS vêm no template completo.

---

## ÉPICO E1 — Perfil do Cliente e Família

| ID | História (v3) | Onda | Status no protótipo |
|---|---|---|---|
| VIS-101 | Cadastro do perfil com idades-chave | O1 | 🟡 `profile-step.tsx`; falta bloqueio usufruto≤atual + popup de propagação |
| VIS-102 | Cônjuge e regime de casamento | O1 | 🟡 cônjuge ✅; CPF/regime ❌ |
| VIS-103 | Dependentes detalhados | O1 | 🟡 idade+nascimento ✅; vínculo ❌ |
| VIS-104 | Salvar, listar e reabrir casos | O1 | ✅ Neon JSONB + autosave local; restauração testada |

**VIS-105 — Identidade leve do advisor e isolamento por usuário** *(nova)*
Épico: E1 · Onda: O1 · Must · Complexidade (BA): P · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero entrar com uma identidade leve (nome/funcional,
sem OAuth) e ver apenas os MEUS casos salvos além das personas-padrão, para que
cada advisor trabalhe no seu universo sem fricção de login.
Aceite — Sucesso: login por nome desbloqueia o workspace; casos salvos ficam
escopados ao identificador; personas seed visíveis para todos; logout limpa
recentes locais. Aceite — Exceções: banco indisponível → salvar cai em modo
local com aviso "salvo localmente" (nunca erro opaco); identificador novo →
universo vazio sem erro. Aceite — Validações: nome 1–80; nenhuma credencial no
bundle do cliente (acesso a banco só server-side).
Técnico/Contexto: Ref. viva: `login.tsx`, `/api/scenarios` (Route Handler →
Neon, `server-only`), `lib/db/*` · Dep.: VIS-104 · NFR: erros reais expostos
(503/400/404), zero PII na URL.

**VIS-106 — Biblioteca de personas e casos recentes** *(nova)*
Épico: E1 · Onda: O1 · Should · Complexidade (BA): P · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero uma gaveta com "criar do zero", casos
recentes e personas-padrão por segmento, para que a sessão comece em segundos
com um case realista.
Aceite — Sucesso: 6+ personas seed cobrindo segmentos e narrativas (endividado,
recomeço, acumulação, proteção, desacumulação, pós-liquidez); recentes ordenados;
reabrir restaura tudo. Aceite — Exceções: persona corrompida → abre parcial com
aviso. Aceite — Validações: personas seed imutáveis (cópia ao abrir).
Técnico/Contexto: Ref.: `persona-sidebar.tsx`, `lib/mock/clients.ts` · Dep.: VIS-104/105.

## ÉPICO E2 — Renda

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-201 | Rendas recorrentes com crescimento real | O1 | 🟡⚙️ rendas+sobra ✅; `crescimentoRealAA` no motor, UI ❌ |
| VIS-202 | Eventos únicos (bônus, PLR, 13º) com mês | O1 | 🟡⚙️ motor completo (mês+recorrência+13º testados); UI sem mês |
| VIS-203 | Renda na aposentadoria com INSS | O1 | ✅ %/valor + INSS abate (pendência nº 6 respondida de facto) |

## ÉPICO E3 — Despesas

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-301 | Despesas por categoria ampliada | O1 | 🟡 7 categorias ✅; subcategorias de cartão ❌ |
| VIS-302 | Essencial × discricionária | O1 | ✅ flag por item; reserva usa essenciais |
| VIS-303 | % de comprometimento por item | O1 | 🟡 total ✅; por item ❌ |
| VIS-304 | Crescimento real de despesas | O2 | ⚙️ motor pronto (C6); UI ❌ |

## ÉPICO E4 — Patrimônio e Passivos

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-401 | Ativos por classe (imóveis, veículos, exterior, FGTS) | O1 | 🟡 9 classes ✅; tipo de imóvel/FGTS-data ❌ |
| VIS-402 | Passivos completos (Price/SAC) | O1 | 🟡⚙️ motor completo + âncoras; UI usa parcela informada |
| VIS-403 | Patrimônio líquido consolidado | O1 | ✅ tempo real |

**VIS-404 — Enriquecimento patrimonial (multimoeda, titularidade, vínculos)** *(nova)*
Épico: E4 · Onda: O1 · Should · Complexidade (BA): M · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero registrar ativos em moeda estrangeira (com
câmbio), titularidade (titular/cônjuge/conjunto), vincular financiamento ao bem
financiado e informar o seguro de vida do cliente, para que o balanço seja fiel
e a regra de sucessão use o seguro corretamente.
Aceite — Sucesso: ativo em USD/EUR convertido por FX informado compõe o total
em BRL; passivo vinculado ao bem aparece na leitura do balanço; seguro de vida
abate o alvo de Sucessão. Aceite — Exceções: FX ausente → assume 1 com
sinalização; vínculo a bem excluído → desfaz o vínculo com aviso. Aceite —
Validações: FX > 0; titularidade ∈ {titular, cônjuge, conjunto}; seguro ≥ 0.
Técnico/Contexto: Ref.: `Asset.{currency,fxRate,ownership}`,
`Liability.linkedAssetId`, `ClientProfile.lifeInsurance` → `successionTarget` ·
Dep.: VIS-401, VIS-504.

## ÉPICO E5 — Objetivos de Vida

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-501 | Três obrigatórios pré-criados | O1 | ✅ cadeado + auto-cura + invariante no motor |
| VIS-502 | Reserva 6/12 | O1 | ✅ premissa editável (pendência nº 1: essenciais) |
| VIS-503 | Aposentadoria conta centenária | O1 | 🟡⚙️ 3 métodos no motor; seletor de método sem UI |
| VIS-504 | Sucessão regra da casa | O1 | ✅ 20% bruto − previdência − seguros (pendência nº 2: bruto) |
| VIS-505 | Objetivos personalizados | O1 | ✅ (vínculo a dependente ❌) |
| VIS-506 | Pré-preenchimento + propagação | O1 | 🟡 pré-fill ✅; popups ❌ (recálculo ao vivo mitigou) |
| VIS-507 | Cabeçalho-resumo | O1 | 🟡 tiles ✅; idade×ano travado ❌ |

## ÉPICO E6 — Linha do Tempo Dinâmica (assinatura)

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-601 | Paleta de eventos (presets + custom) | O1 | ✅ 11 presets + custom; duração/recorrência |
| VIS-602 | Arrastar evento com curva ao vivo | O1 | ✅ ghost por rAF; **61 fps medidos**; recálculo 0,36 ms |
| VIS-603 | Reposicionar evento | O1 | ✅ + "drag de volta" testado |
| VIS-604 | Aposentadoria-âncora arrastável | O1 | ✅ (popup de propagação ❌) |
| VIS-605 | Objetivos visíveis na timeline | O1 | ❌ a construir |
| VIS-606 | Drag de data-alvo (inverse-solve) | O1 | ⚙️ `solveGoal` pronto/testado; UI ❌ |
| VIS-607 | Eventos após a aposentadoria | O1 | ⚙️ motor projeta em qualquer fase; UI clampa à acumulação — remover trava |
| VIS-608 | Vínculo evento↔objetivo | O1/Should | ❌ |
| VIS-609 | Desfazer + teclado | O1/Should | 🟡 teclado/editor ✅; Ctrl+Z ❌ |

## ÉPICO E7 — Projeção e Sinais Vitais

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-701 | Fluxo sempre visível no topo | O1 | 🟡 workspace ✅; demais etapas parcial |
| VIS-702 | Projeção com fases | O1 | ✅ (sombreado por fase ❌) |
| VIS-703 | Painel de sinais vitais | O1 | ✅ 6 KPIs clicáveis com detalhe |
| VIS-704 | Real × nominal | O1 | 🟡⚙️ motor C4 completo; toggle de UI ❌ |

## ÉPICO E8 — Parâmetros do Plano

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-801 | Aporte ≤ sobra, idade travada | O1 | ✅ invariante testada (50 cases) |
| VIS-802 | Perfis de retorno + premissas visíveis | O1 | ✅ 4 cenários + diálogo de premissas com fonte/ano |
| VIS-803 | Probabilidade (checkpoints 70/100) | O2 | 🟡 determinístico ✅ (marcas no slider); Monte Carlo = motor v2 |

**VIS-804 — Múltiplos cenários por cliente** *(nova)*
Épico: E8 · Onda: O1 · Must · Complexidade (BA): M · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero criar, duplicar, renomear e alternar entre N
cenários do mesmo cliente (com um cenário-base automático), para que a conversa
compare caminhos sem destruir o plano de partida.
Aceite — Sucesso: cenário-base criado automaticamente na 1ª abertura (sem
duplicar em re-render); duplicar copia parâmetros; alternar troca todos os
números instantaneamente; comparação lado a lado dos KPIs. Aceite — Exceções:
excluir o cenário selecionado → seleção cai para o base; último cenário não é
excluível. Aceite — Validações: nome 1–40; criação idempotente (StrictMode).
Técnico/Contexto: Ref.: `ensureBaseScenario` (ação atômica do store),
`workspace.tsx` (chips de cenário, Duplicar/Comparar) · Dep.: VIS-104, motor.

**VIS-805 — Modo dinâmico (recálculo ao vivo, sem botão)** *(nova)*
Épico: E8 · Onda: O1 · Must · Complexidade (BA): M · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero que qualquer mudança (slider, dado, evento)
recalcule o plano imediatamente — sem botão "rodar simulação" —, para que a
sessão flua como uma conversa.
Aceite — Sucesso: toggle "modo dinâmico" ligado por padrão; sliders → KPIs/curva
em <100 ms percebidos; "saldo livre" (sobra − alocado) sempre visível; alertas
distintos de DÉFICIT (sobra negativa) e SUPERALOCAÇÃO (alocado > sobra).
Aceite — Exceções: falha de recálculo → mantém último estado válido. Aceite —
Validações: números 100% do motor; recálculo < 5 ms (bench).
Técnico/Contexto: Ref.: `workspace.tsx` (dynamic mode, freeBalance, alerts) ·
Dep.: motor, VIS-801.

**VIS-806 — Questionário de suitability** *(nova)*
Épico: E8 · Onda: O1 · Must · Complexidade (BA): P · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero um questionário de perfil de risco (5
perguntas, escala 0–3) que gere score, perfil e alertas, para que o retorno
esperado parta do perfil regulatório do cliente.
Aceite — Sucesso: score 0–100 → conservador/moderado/agressivo; flags (provedor
único, dependentes 2+, horizonte curto, perfil×horizonte) exibidas. Aceite —
Exceções: editar uma resposta → score/perfil/flags são INVALIDADOS e recalculados
(nunca stale). Aceite — Validações: perfil mapeia para os retornos das premissas.
Técnico/Contexto: Ref.: `suitability-step.tsx`, `scoreSuitability`,
`SUITABILITY_QUESTIONS` · Dep.: VIS-802.

## ÉPICO E9 — Plano Ideal com IA (BIA)

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-901 | Plano Ideal em um clique | O1 | ✅ proposta estrutural → validador → motor |
| VIS-902 | Racional simples | O1 | ✅ template i18n + slots do motor (Regra Zero §3 estrito) |
| VIS-903 | Antes→depois, ajuste, regenerar | O1 | 🟡 animação+regenerar ✅; diff por parâmetro ❌ |
| VIS-904 | Resiliente sem IA | O1 | ✅ fallback determinístico, mesmo formato |
| VIS-905 | Privacidade por construção | O1 | ✅ payload anonimizado (teste PII explícito a adicionar) |

**VIS-906 — Copilot conversacional (BIA no plano)** *(nova)*
Épico: E9 · Onda: O1 · Should · Complexidade (BA): M · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero conversar com a BIA num painel lateral com o
CONTEXTO do plano aberto (snapshot anonimizado), para tirar dúvidas e gerar
argumentos durante a sessão.
Aceite — Sucesso: chat com streaming; respostas citam os números do plano
corrente; chave de API só no servidor. Aceite — Exceções: sem chave → painel
degrada com aviso, jornada segue. Aceite — Validações: snapshot enviado sem
PII (mesma política do VIS-905); números exibidos na UI nunca vêm do chat
(Regra Zero — o chat é prosa, não fonte de número de tela).
Técnico/Contexto: Ref.: `advisor-copilot/copilot-panel.tsx`,
`app/api/advisor/route.ts` (streaming), `lib/advisor-context.ts` · Dep.: VIS-905.

**VIS-907 — "Pergunte à BIA" contextual nos indicadores** *(nova)*
Épico: E9 · Onda: O2 · Could · Complexidade (BA): P · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero um atalho em cada indicador que abra o copilot
com a pergunta certa pré-carregada, para transformar dúvida do cliente em
resposta imediata.
Aceite — Sucesso: botão no detalhe do KPI abre o chat com prompt contextual.
Aceite — Exceções: copilot indisponível → atalho oculto. Aceite — Validações:
prompt pré-carregado é editável antes do envio.
Técnico/Contexto: Ref.: `askBia`/`copilotPrompt` no store · Dep.: VIS-906.

## ÉPICO E10 — Engajamento

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-1001 | Aba do porquê | O1 | ✅ 4 cards, antes do wizard, pulável |
| VIS-1002 | Pitch por segmento | O2 | ✅ já entregue (exemplo FV calculado pelo motor) |
| VIS-1003 | CTA começar plano | O1 | ✅ ("continuar meu plano" ❌) |

## ÉPICO E11 — Sessão do Advisor

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-1101 | Tela compartilhada | O1 | ✅ (auditoria AA formal pendente) |
| VIS-1102 | Sem perda de dados | O1 | ✅ autosave + Neon; testado |
| VIS-1103 | Efetivação explícita | O2 | 🟡 fase Entrega/aprovação ✅; semântica "simulação" ❌ |
| VIS-1104 | Pré-preenchimento do banco | O3 | 🔮 simulado pelos dossiês seed |

**VIS-1105 — Bilíngue EN/PT-BR com troca ao vivo** *(nova)*
Épico: E11 · Onda: O1 · Should · Complexidade (BA): P · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero alternar o idioma da interface (EN/PT-BR) ao
vivo, para atender clientes e demonstrações internacionais sem outra build.
Aceite — Sucesso: toggle persistente; 100% das strings traduzidas (paridade de
chaves verificada); formatação monetária/datas por locale. Aceite — Exceções:
chave faltante → fallback ao default sem quebrar. Aceite — Validações: racional
da BIA e textos do porquê também são templates por idioma.
Técnico/Contexto: Ref.: `next-intl`, `messages/{en,pt-BR}.json` (paridade
auditada) · Dep.: transversal.

## ÉPICO E12 — Confiança e Conformidade

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-1201 | Origem única (Regra Zero) | O1 | ✅ motor+validador+grep+testes (CI a montar) |
| VIS-1202 | Selo ilustrativo + premissas | O1 | 🟡 premissas ✅; selo permanente ❌ |
| VIS-1203 | Snapshot por plano | O2 | 🟡 payload salva o plano inteiro c/ premissas; versionamento ❌ |

## ÉPICO E13 — Resultado e Report

| ID | História (v3) | Onda | Status |
|---|---|---|---|
| VIS-1301 | Resumo do plano | O2 | 🟡 Output/payload ✅; 1-pager imprimível ❌ |
| VIS-1302 | Report por persona | O3 | ❌ |

**VIS-1304 — Oportunidades de cross-sell pós-aprovação** *(nova)*
Épico: E13 · Onda: O2 · Should · Complexidade (BA): M · **Status: ✅ implementado**
Descrição: Como Advisor, eu quero, após a aprovação do plano, uma lista
ranqueada de oportunidades de produto derivadas dos SINAIS do plano (dívida
cara, lacuna de proteção, sobra não investida…), para converter aconselhamento
em negócio com pertinência.
Aceite — Sucesso: oportunidades com score, racional e valor dimensionado a
partir dos totais do motor; pacote de saída (JSON) pronto para o CRM. Aceite —
Exceções: nenhum sinal → lista vazia honesta. Aceite — Validações: valores
derivam dos totais do motor (sem aritmética nova de UI); mapa de produtos
configurável.
Técnico/Contexto: Ref.: `lib/cross-sell.ts` (product map), `lib/output.ts`,
`output.tsx` · Dep.: VIS-1301, motor.

---

## ÉPICO E14 — Motor de Cálculo (novo — fundação de tudo)

Tema: o motor determinístico padrão CFP que alimenta 100% dos números.
**Spec de reconstrução completa: `docs/ENGINE_SPEC.md`** (fórmulas, contratos,
algoritmos, âncoras e armadilhas). Status global: ✅ implementado e revisado
(revisão adversarial multi-agente; 129 testes; bench 0,36 ms).

**VIS-1401 — Mathcore: TVM, conversões e Fisher**
O1 · Must · M · **✅** Como Time de Produto, eu quero um núcleo TVM de 5
variáveis (BEG/END) com conversões geométricas e Fisher exato, para que toda
matemática financeira tenha uma única fonte auditável. Aceite — Sucesso:
resolve n, i, pv, pmt, fv (bisseção robusta p/ i e n); âncoras: 12%→0,948879%;
Fisher 10/4→5,76923%; FV 12.682,50/12.809,33; PV 166.791,61. Exceções: 0 ou 2+
incógnitas → erro explícito; sem bracket → erro (nunca número errado).
Validações: tolerância relativa 1e-6; roundtrip das 5 variáveis. Técnico:
`engine/mathcore.ts`; PROIBIDO nominal/12 e Fisher por subtração (C2/C3).

**VIS-1402 — Projeção mensal com saída anual**
O1 · Must · G · **✅** Como Time, eu quero a projeção patrimonial em loop MENSAL
(eventos com ano+mês, 13º, fases acumulação/usufruto) agregada por ano, para
que sazonalidade e timing reais apareçam no plano. Aceite — Sucesso: saída
`{ano, idade, entradas, saidas, saldoCaixa, patrimonio, fase}` + flags
`anosNegativos` + resumo; dezembro ≠ janeiro (capitalização intra-ano); dívida
financiada pelo portfólio na desacumulação; gap derivado dos fluxos do MÊS.
Exceções: case parcial → defaults sem exceção; déficit recorrente → flag (sem
auto-financiamento); evento não-financiado → flag. Validações: invariante de
contabilidade exata com retorno 0; 780 meses + 20 eventos < 5 ms. Técnico:
`engine/projection.ts`; ordem de saque liquidez→plano→outros→exterior→previdência.

**VIS-1403 — Regras Vision (sobra, reserva, sucessão, aposentadoria)**
O1 · Must · M · **✅** Como Negócio, eu quero as regras da casa codificadas em
um único módulo, para que alvo de objetivo seja política, não opinião de tela.
Aceite — Sucesso: reserva = mult(6|12)×essenciais; sucessão = max(0,
20%×bruto − previdência − seguros); aposentadoria em 3 métodos com INSS
abatendo; capital por método (depletion = anuidade até 100; perpetuidade =
gap/i_m). Exceções: gap ≤ 0 → capital 0; i_m ≤ 0 em perpetuidade → ∞ sinalizado.
Validações: sucessão nunca negativa; renda contínua anualizada por mesesPorAno.
Técnico: `engine/rules.ts` (premissas SÓ de `assumptions.ts`).

**VIS-1404 — Amortização Price/SAC**
O1 · Must · P · **✅** Como Advisor, eu quero parcelas Price e SAC derivadas de
taxa EFETIVA, para que passivos componham o fluxo corretamente. Aceite —
Sucesso: âncora SAC 120k/120m/1%: amort 1.000, 1ª 2.200, última 1.010, saldo 0;
Price constante com Σ amortizações = principal. Exceções: taxa 0 → linear; fora
do prazo → 0. Validações: tolerância 1e-6; rotular "sem CET". Técnico:
`engine/amortization.ts` + `liabilityPaymentAt(l,k)`.

**VIS-1405 — solveGoal (aporte p/ alvo + ano viável)**
O1 · Must · M · **✅** Como Advisor, eu quero o aporte necessário de qualquer
objetivo e, quando não couber na sobra, a primeira DATA viável, para negociar
metas com custo transparente. Aceite — Sucesso: PMT por TVM (pv projetado já
cobre → 0); clamp à sobra líquida dos outros objetivos; ano viável por bisseção
(PMT decrescente em n). Exceções: inviável até anoBase+80 → null honesto;
anoAlvo ≤ anoBase → shortfall à vista (contrato documentado). Validações:
FV(aporte clampado) confere com o alvo. Técnico: `engine/solve.ts`.

**VIS-1406 — idealPlan determinístico**
O1 · Must · M · **✅** Como Negócio, eu quero a alocação ideal da sobra em
cascata de prioridade (Reserva→Aposentadoria→Sucessão→demais), para que o
"Plano Ideal" seja reprodutível e defensável. Aceite — Sucesso: Σ alocações ≤
sobra SEMPRE (property-based 50 cases); 3 obrigatórios presentes em todo output;
aceita proposta VALIDADA da BIA (reordenar, datas, multiplicador, método, flag
INSS); idade proposta clampada e horizonte derivado da idade CLAMPADA. Exceções:
sobra ≤ 0 → todas as alocações 0. Validações: determinismo; slots de racional no
output. Técnico: `engine/ideal.ts`.

**VIS-1407 — Validador Regra Zero (whitelist endurecida)**
O1 · Must · M · **✅** Como Risco/Compliance, eu quero que NADA numérico da IA
passe do validador, para que a Regra Zero seja garantia técnica, não promessa.
Aceite — Sucesso: whitelist estrita (ordem, datas, 6|12, método, flag
considerarINSS); JSON-roundtrip mata getters TOCTOU; null-prototype +
hasOwnProperty matam prototype-poisoning; varredura de dígitos em strings.
Exceções: QUALQUER campo desconhecido → proposta inteira rejeitada → plano
determinístico. Validações: bateria de payloads maliciosos (monetários,
__proto__, datas no anoBase, flags falsas) rejeitados. Técnico:
`engine/validator.ts`.

**VIS-1408 — CaseStore e modo real × nominal**
O1 · Should · P · **✅** Como Time, eu quero casos por ID com cópias defensivas
e o modo nominal como transformação única de Fisher, para integração estilo
case-centric sem risco de mistura de bases. Aceite — Sucesso:
create/get/update/delete/list com structuredClone nas duas direções; nominal =
real × (1+inf)^(ano−base+1) em UM ponto; veredito financiado/deficitário
idêntico nos dois modos. Exceções: update de id inexistente → erro claro.
Validações: inflação 0 → nominal ≡ real byte a byte. Técnico:
`engine/case-store.ts`, `inflateProjection` (C4).

**VIS-1409 — Harness de qualidade (âncoras, paridade, bench, regressão)**
O1 · Must · M · **✅** Como Time, eu quero a régua de qualidade automatizada do
motor e da integração, para que qualquer refactor/reconstrução prove paridade.
Aceite — Sucesso: `npm test` (âncoras CFP 1e-6 + invariantes + property-based +
validador + regressões da revisão adversarial); `npm run bench` < 5 ms;
`golden:check` (3 cases, ±R$1/0,1%, deltas legítimos PINADOS);
`golden/regression.mjs` (33 checks de navegador: 60fps, leak, console, Plano
Ideal real). Exceções: delta novo fora da lista pinada → falha (regressão).
Validações: revisão adversarial dos 2 P0 com testes nomeados. Técnico:
`engine/__tests__/`, `golden/`, `PARITY_NOTES.md`.

---

## WORKFLOW, BPM, NFRs, DoR/DoD

Inalterados da v3 (válidos como estão), com três reforços vindos da prática:
1. **Gate de deploy** confirmado em uso real: aprovação → push da branch
   (Preview Vercel) → validação → merge só sob ordem.
2. QA ganhou instrumentos prontos: golden values com deltas pinados, bateria de
   33 checks, bench de motor — citar nos DoD ("números validados contra o
   motor" = `golden:check` verde).
3. Code review: o grep de aritmética na UI tem padrão definido
   (`Math.pow|*(1+|/12|Math.exp` em `components/` → só animação/formatação).

## Pendências de negócio (estado v4)

| # | Pendência | Estado |
|---|---|---|
| 1 | Base do multiplicador da reserva | **Respondida de facto: essenciais** (implementado) — ratificar |
| 2 | Sucessão bruto × líquido | **Respondida de facto: 20% do BRUTO, previdência+seguros abatem** — ratificar |
| 3 | Semântica checkpoints 70/100 | Aberta — hoje determinístico (logística/funding); Monte Carlo no motor v2 |
| 4 | Reserva arrastável | Aberta — implementar com flag (VIS-606) |
| 5 | Funding pós-usufruto | **Respondida de facto: aportes cessam no usufruto** — ratificar |
| 6 | INSS abate ou compõe teto | **Respondida de facto: abate** (teto editável nas premissas) — ratificar |

## Sequenciamento sugerido (releases) — v4

- **R0 (fundação)**: E14 completo (motor + harness) — pré-requisito de tudo;
  critério de saída: âncoras verdes + bench + ENGINE_SPEC validada pelo time.
- **R1 (núcleo)**: E1–E5 + E7 + E8 (incl. VIS-804/805/806; sem VIS-803 MC) +
  VIS-1101/1102/1105 + VIS-1201/1202.
- **R2 (diferencial)**: E6 completo (incl. 605/606/607/608/609) + E9 (incl.
  906/907) + VIS-1001/1003.
- **R3 (extensões)**: VIS-304, 803(MC), 1002*, 1103, 1104, 1203, E13 (incl. 1304).

\* VIS-1002 já existe no protótipo — antecipável a custo zero.
