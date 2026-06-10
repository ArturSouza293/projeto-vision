# Changelog

## v7 — Eventos da timeline → Oportunidades de cross-sell (branch `feature/v7-cross-sell-eventos` — em validação, sem deploy)

- **Auditoria primeiro** (`docs/AUDIT_CROSS_SELL.md`): a matriz provou que a
  timeline era invisível para o cross-sell (14 fontes ausentes, 4 parciais);
  a implementação cobriu SÓ os gaps — as 10 regras existentes ficaram intactas
  (com testes de regressão novos).
- **B1 — eventos → sinais** (`lib/cross-sell-events.ts`, determinístico):
  entrada grande → alocação da entrada (+ sucessão quando herança × gap);
  saída planejável → poupança programada com aporte do MOTOR (TVM, rota do
  solveGoal) ou financiamento planejado/consórcio quando próximo e não cabe na
  sobra; educação consolida evento+objetivo numa oportunidade só (origens
  listadas); abrir negócio → funding + revisão de proteção; viagem → câmbio só
  acima do limiar; evento pós-aposentadoria → revisão de desacumulação citando
  `anoEsgotamento` do motor; custom nunca ignorado.
- **B2 — plano → sinais**: objetivo sem funding → aporte programado;
  esgotamento → renda vitalícia; suitability × alocação divergente →
  realocação; titularidade concentrada + sucessão → planejamento sucessório.
- **B3 — pertinência/ranqueamento** (`lib/cross-sell-config.ts`, confirmado
  com o negócio): limiar 20% da renda anual; janela de 5 anos com decaimento
  linear; score de evento explicável (fit + proximidade + valor relativo);
  consolidação por produto com origens mescladas; teto de exibição 5 +
  "ver todas"; lista vazia honesta preservada.
- **B4 — UI/payload**: cada card mostra a ORIGEM do sinal ("derivada do
  evento: Venda de imóvel · 2031" / "derivada do plano: gap de proteção");
  racionais viraram templates ICU com slots numéricos formatados por locale
  (EN/PT em paridade); o JSON do CRM ganhou `origemSinal` por oportunidade.
- QA: 19 testes nomeados por regra; 156 testes totais; golden INALTERADO
  (cross-sell não toca a projeção); 7/7 checks de navegador; grep de
  aritmética em components/ limpo. Bugfix pego pelos testes: dupla divisão
  por 12 no aporte programado (subestimava 12×).

## v6 — Timeline redesenhada + Gate de senha (branch `feature/v6-timeline-gate` — em validação, sem deploy)

### Parte A — Redesign da faixa de eventos (referência: timeline_vision.jsx)
- **Lanes**: eventos empacotados na primeira camada livre (gap 14px) — zero
  sobreposição de labels com 22+ eventos (verificado por colisão de bounding
  boxes); a faixa cresce em altura conforme as lanes; **reorganização AO VIVO
  durante o arrasto** com transição de 180ms (`prefers-reduced-motion`
  respeitado).
- **Chips ricos**: ícone temático em quadrado colorido (presets existentes) +
  nome + ano + seta de direção (entrada verde ↓ / saída laranja ↗); conectores
  SVG finos até o ponto no eixo, com realce no selecionado.
- **Marco**: badge vermelho Bradesco com bandeira e guia tracejada — a
  Aposentadoria continua sendo a ÂNCORA REAL (clamps retMin/retMax e
  recálculo ao vivo preservados); clique abre painel do marco com slider de
  idade.
- **Régua adaptativa** (passo 1/2/5/10 com ≥46px) + marca de "hoje" + **scroll
  horizontal honesto** (MIN_PX_PER_YEAR=16, ResizeObserver).
- **Painel de edição inline** no layout da referência (cabeçalho colorido,
  fechar no X, Remover em vermelho-claro): nome, toggle Saída/Entrada, valor,
  ano com range slider + input sincronizados, e os campos do protótipo
  preservados (Recorrente + duração).
- **Interações**: pointer capture com snap por ano; tap (≤4px) seleciona;
  teclado ←/→ ±1, Shift ±5, Enter/Espaço, Delete; aria-labels com valor
  formatado; foco visível.
- **VIS-607 habilitado**: o horizonte da faixa vai até a longevidade do caso e
  eventos podem viver na fase de usufruto (o motor já projetava ambas as
  fases; a trava da UI v1 foi removida).
- Dados/Regra Zero intactos: o JSX era referência de UI; eventos vêm do store,
  recálculo via motor por rAF (ghost), formatação pelo i18n do app, strings em
  `messages/*` com paridade EN/PT. Tipografia global mantida (ponto a
  confirmar nº 1 — Fraunces/Hanken só com decisão app-wide).

### Parte B — Gate de senha (tela preta antes de tudo)
- `proxy.ts` (Next 16 renomeou middleware → proxy): sem cookie, páginas são
  reescritas para `/gate` (nenhum HTML do protótipo servido) e TODAS as APIs
  respondem 401. Senha só em `GATE_PASSWORD` (env local + Vercel); cookie
  httpOnly/sameSite=lax/Secure-em-https com token SHA-256 não-reversível,
  24h. Sem a env o gate fica desarmado (fail-open documentado). Login do
  advisor permanece DEPOIS do gate (camadas distintas). **Gate de
  demonstração** — não é autenticação de produção (nota no README).
- Scripts de QA e da demo autenticam via `golden/gate-helper.mjs` (lê
  env/.env.local; a senha não existe hardcoded no repo).

### QA v6
- 17/17 checks novos (gate no navegador; zero-sobreposição com 22 chips;
  lane reorganizando DURANTE o drag; slider+input sincronizados; Remover;
  painel do marco; evento pós-aposentadoria sem NaN) + **zero regressão**:
  33/33 da bateria geral e 17/17 da v5 sobre a timeline nova; 137 testes;
  golden de paridade inalterado; bench 0,57 ms.

## v5 — Peer insights + Comparação de planos (branch `feature/v5-peers-cenarios` — em validação, sem deploy)

### Feature 1 — Modal de evento customizado com sugestões de peers
- "+ Evento customizado" agora abre um modal grande com duas abas (padrão ALTO):
  **Sugestões para você** (default) — "O que pessoas como você estão
  planejando?", chips derivados do caso real (faixa etária, renda, composição,
  segmento), carrossel de cards com estatística-âncora ILUSTRATIVA, proposta
  personalizada calculada LOCALMENTE sobre a renda do caso (65% do salário
  anual, 4× renda anual, valor típico do segmento), prova social do dataset e
  seleção múltipla → eventos pré-preenchidos na timeline (curva reage na hora);
  **Criar do zero** — formulário completo (nome, categoria, fluxo, valor com
  steppers e eco do total, único/recorrente, **ano + mês**, duração, vínculo a
  objetivo) com dica de peer por categoria, dismissível.
- Arquitetura honesta: `PeerInsightsProvider` atrás de interface;
  `MockPeerInsightsProvider` lê um dataset JSON curado (10 insights × valores
  por segmento) — trocar pela base anonimizada real não toca a UI. Tudo local;
  nenhum dado sai do app; **nenhuma chamada de IA nesta versão** (Regra Zero).
- Motor: eventos com `month` explícito fluem até o loop mensal (C1); default
  continua dezembro (paridade v2 — golden inalterado).

### Feature 2 — Planos A/B/C + modal "Resumo dos Planos"
- **Variantes de caso**: duplicar o caso vivo como plano colorido (A azul ★
  referência, B verde, C laranja, D roxo; limite 4), alternar pelos chips,
  editar cada um de forma independente (deep copy; sessão local — o save no
  banco continua levando só o plano ativo).
- **Motor**: `summarize(case)` → KPIs comparáveis (ano/patrimônio na
  aposentadoria, ano de esgotamento, renda média mensal no usufruto, gap anual
  vs despesas essenciais, herança na longevidade) e `compare(ref, outros)` com
  deltas — funções puras derivadas de `project()`, 7 testes novos.
- **Modal de comparação** (padrão Plan Summary da ALTO): colunas lado a lado
  com chip colorido e badge de referência; número grande do patrimônio com
  alerta vermelho "esgota em YYYY"; renda média e gap (verde "Sem gap" /
  vermelho) com deltas ▲/▼ vs referência; herança; **próximos passos derivados
  deterministicamente por templates de regra** (recebimento futuro,
  compromisso recorrente, gap, esgotamento, objetivo em risco + stress test
  padrão) com adição manual e checkboxes visuais; "definir como referência";
  selo de valores ilustrativos.
- QA: 17/17 checks novos de aceitação (incl. personalização provada: mesmo
  card → R$ 131k para Camila vs R$ 162k para Fernanda) + regressão 33/33 +
  137 testes + golden de paridade inalterado.

## Vision Engine + integração (branch `feature/vision-engine` — em validação, sem deploy)

### Fase A — motor de cálculo padrão CFP (`engine/`)
- Pacote TypeScript puro, zero dependência de UI: TVM 5 variáveis (BEG/END,
  bisseção robusta), conversões geométricas (BR — nunca nominal/12), Fisher
  exato, growing annuities (incl. g = r), projeção MENSAL com saída anual
  (eventos com ano+mês, 13º via `mesesPorAno`), regras Vision (reserva,
  sucessão, aposentadoria em 3 métodos com INSS abatendo a renda-alvo),
  `solveGoal` (PMT + ano viável), `idealPlan` determinístico, Price/SAC com
  taxa efetiva mensal, `CaseStore`. Premissas ilustrativas concentradas em
  `engine/assumptions.ts`.
- **Regra Zero**: a LLM não calcula nada. `engine/validator.ts` (whitelist,
  endurecido contra TOCTOU/prototype-poisoning/números em strings) só admite
  proposta ESTRUTURAL da BIA; 100% dos números exibidos saem do motor.
- 129 testes (âncoras HP-12C tol. 1e-6, invariantes, property-based 50 cases,
  validador com payloads maliciosos, regressões da revisão adversarial
  multi-agente — incl. 2 P0 reais corrigidos: serviço de dívida na
  desacumulação agora é sacado do patrimônio, e `mesesPorAno < 12` honrado).
  Bench: ~0,36 ms/projeção de 65 anos (gate < 5 ms).

### Fase B — integração invisível
- Toda aritmética de juros/projeção do front migrou para o engine via
  `lib/engine/adapter.ts` — os componentes seguem chamando as MESMAS funções
  (`projectPlan`, `goalFundedPct`, `annuityFactor`…), agora engine-backed.
- Paridade auditada por golden values (3 cases de referência): tudo dentro de
  ±R$1/±0,1% exceto 7 deltas legítimos da capitalização mensal, documentados
  (PARITY_NOTES.md) e pinados contra regressão (golden/accepted-deltas.json).
- "Plano Ideal com a BIA" agora cumpre a Regra Zero de ponta a ponta: a API
  devolve só estrutura → validador whitelist → `engine.idealPlan` → sliders; o
  racional virou template i18n interpolado com os números do motor (a única
  mudança de comportamento visível — exigida pelo spec).
- Entregues: INVENTORY.md, PARITY_NOTES.md, BACKLOG.md, golden/ (captura +
  paridade + smoke). Produção intocada — tudo local na branch.

## Demo-video pipeline (~36s, silent, PowerPoint-ready)
- `npm run demo` records the six storyboard scenes with Playwright (fresh context per
  scene seeded from localStorage fixtures, fake cursor overlay, slow human-like drags so
  the curve visibly reacts DURING the drag) and assembles `demo/out/demo_vision.mp4`
  with ffmpeg (per-scene cuts from timing marks, mild speed-up only on the tour scenes
  — wizard 2.1×, goals 1.65× — brand cards, 0.3s fades, 1080p H.264 `yuv420p`, no
  audio). Scenes: why-plan → pre-filled wizard → goals registration (3 mandatory locked
  goals + adding one from the menu) → live life-event drag → retirement drag → Plano
  Ideal. Each scene gets an executive caption overlay (texts in the storyboard's
  `caption` field, rendered to transparent PNGs at build time). All pacing lives in
  `demo/storyboard.json`. Invisible `data-testid`s were added to the components the
  script drives.

## v2 — Live timeline, "Plano Ideal" (BIA) & QA sweep

Evolves the FP prototype with the three demo-defining changes (dynamic event
timeline, the "Por que planejar?" opener, and the AI "Plano Ideal" button) plus
a full bug/UI pass and the transversal domain rule. Each phase is a reviewable
commit on `main` (auto-deploys to Vercel).

### Major change 1 — Dynamic life-events timeline
- New `LifeEvent` model (`outflow`/`inflow`, one-time or recurring) on
  `plan.lifeEvents`; the projection (`lib/calc.ts project()`) is now
  **event-aware** (a per-year inflow/outflow map). With no events the numbers are
  identical to before.
- `components/charts/wealth-timeline.tsx`: a draggable events track aligned to the
  wealth chart's x-axis. **Drag a chip → a dimmed ghost curve recomputes every
  animation frame → commit on drop.** A draggable **retirement anchor** shifts the
  accumulation→decumulation boundary live. Keyboard (←/→/Enter/Delete) + an inline
  editor (year / amount / direction / remove) for accessibility; a preset palette
  (buy property, car, trip, education, wedding, child, renovation, business, sell
  property, inheritance, bonus, + custom) to drop events.
- v1 scope: events live in the accumulation phase, so the success-probability and
  income-gap KPIs stay correct.

### Major change 2 — "Por que planejar?" opening screen
- New `components/engine/why-plan.tsx`, shown **once per session before the
  cadastro**. Four conversational accordion cards, a segment selector
  (Retail/Prime/Principal/Private) that retargets a **dynamic future-value
  example** (e.g. Prime R$1M at 65: start at 35 ≈ R$1.486/mo vs ≈ R$2.798/mo at
  45), and a CTA "Começar meu plano" that opens the wizard.
- Non-persisted `introSeen` store flag gates it.

### Major change 3 — "Plano Ideal com a BIA"
- One button calls Claude to set all four plan parameters to fund the goals,
  then **animates the sliders current→ideal** and shows a **"Racional da BIA"**
  card explaining the plan.
- New server route `app/api/plano-ideal/route.ts` on the most-capable **real**
  model `claude-opus-4-8` (env `PLANO_IDEAL_MODEL`). Note: the spec's
  `claude-fable-5` is only a local Claude Code alias — the API rejects it — so we
  use the model it points to.
- **Privacy:** `buildPlanoIdealPayload` sends only anonymized numbers (no name,
  CPF, e-mail, DOB — never anything identifiable).
- **Guardrails:** every model value is clamped to the real slider limits; the
  contribution cap is the **free** surplus (surplus − goal contributions) so the
  ideal plan never over-allocates; strict-JSON parse with one retry, then a
  deterministic **offline heuristic** fallback (labelled "modo offline").

### Domain rule — the 3 mandatory goals
- Emergency Reserve, Retirement and Succession can now **never be removed**, only
  parameterized: a store guard makes `removeGoal` a no-op for them, the delete
  control becomes a lock, they're removed from the "add goal" menu, and they
  **self-heal** (a deleted one is re-merged on the next Goals-step / workspace
  entry) without duplicating or wiping custom goals.

### QA sweep (no P0 found; P1 + quick P2 fixed)
- `ASSET_CLASSES` now covers all nine classes — vehicle/exterior/FGTS no longer
  turn the composition into `NaN` and vanish from the donut.
- Retirement-age slider no longer collapses when the usufruct age ≤ current age.
- Income/Expense/Net-worth steps select their store actions (no `getState()` in
  render); net-worth lists get empty states; engine calls are wrapped so a
  rejected projection can't become an unhandled rejection.
- Changing a suitability answer clears the stale computed profile/score/flags.

### Final review pass
A multi-agent adversarial review over the whole v2 diff confirmed the projection
is **byte-identical with no life events** (22,680-combo sweep, 0 diffs) and i18n
is at full EN/PT parity. Fixes from it: the timeline now tears down its drag
listeners + pending animation frame **on unmount** (plus a `pointercancel` path
and a tap-vs-drag guard on the retirement anchor so a click no longer forces a
custom scenario); the Plano Ideal tween cancels cleanly (no racing tweens, and
no redundant retry when the API key is absent); the ghost curve merges **by
year** (robust to a changing horizon); and the retirement marker derives from the
clamped age.

---

## Earlier — Server-side persistence on Neon
- Replaced the browser-side Supabase access with a **server-only Neon Postgres**
  layer (`/api/scenarios` + `lib/db/*`, raw SQL over `@neondatabase/serverless`).
  Fixes the opaque "Não foi possível salvar"; saved plans are scoped per user
  (the advisor's name), survive a refresh/redeploy, and no DB credential ships to
  the browser. See the README "Scenario persistence (Neon Postgres)" section.
