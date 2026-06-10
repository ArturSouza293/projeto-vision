# Changelog

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
