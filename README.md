# Projeto Vision — Advisor Financial Planning Journey

A **standalone planning simulation engine** for a Brazilian wealth-management context
(Bradesco / "Projeto Vision"). Client data arrives from the bank (cadastral +
financial), an analyst works a **scenario loop** (create / recalculate N scenarios
live), and on approval the engine emits an **outbound API payload** back to the bank's
Salesforce — the approved plan + **cross-sell opportunities** + generated data.

Salesforce is just the integration boundary (inbound dossiers, outbound payload), not
the look of the product. The architecture, typing and I/O layer are clean and
swappable, so the mock stubs can become real Salesforce / planning-engine calls.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives, `radix-nova` style)
- **Framer Motion** — fluid step transitions & micro-interactions
- **Recharts** — all data visualizations
- **react-hook-form** + **zod** — forms & validation
- **Zustand** (+ `persist`) — cross-step state in `localStorage`
- **next-intl** — i18n (EN default + PT-BR), used as a client provider
- **lucide-react** — icons
- **@anthropic-ai/sdk** — the streaming in-app AI copilot

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. (pnpm/yarn work too — npm is used here because the
machine's Node lives under `Program Files`, where Corepack can't write shims without
admin.)

```bash
npm run build     # production build (type-check + lint + bundle)
npm run start     # serve the production build
npx tsc --noEmit  # strict type-check only
```

> An `.npmrc` sets `legacy-peer-deps=true` to smooth React-19-era peer ranges.

---

## The AI copilot (ANTHROPIC_API_KEY)

The "Advisor of the Advisor" copilot streams real responses from Claude. The key is
**server-side only** — all calls go through the route handler at
[`app/api/advisor/route.ts`](app/api/advisor/route.ts); it is never exposed to the client.

1. Copy the example env file and add your key:
   ```bash
   cp .env.local.example .env.local
   ```
2. Set `ANTHROPIC_API_KEY` in `.env.local` (get one at <https://console.anthropic.com/>).
3. Optionally override the model with `ADVISOR_MODEL` (defaults to `claude-sonnet-4-6`).

Without a key the copilot still opens and degrades gracefully — it shows a hint to set
the key instead of crashing. With a key it streams answers and can suggest a structured
**event** (a review meeting, a rebalancing reminder) the advisor accepts with one click.

---

## Scenario persistence (Neon Postgres)

Saved personas/scenarios are stored in **Neon Postgres**, accessed **server-side only**.
The browser never touches the database or sees credentials — every read/write goes through
the route handler at [`app/api/scenarios/route.ts`](app/api/scenarios/route.ts), which calls
the data layer in [`lib/db/scenarios.ts`](lib/db/scenarios.ts) (raw SQL over the Neon
serverless driver). The layer is swappable: reimplement those five functions to move to
another backend without touching the app. Without `DATABASE_URL` the app still runs on
`localStorage` only and a save reports "saved locally" instead of failing.

**Schema** (`migrations/0001_init.sql`): `users (id, identifier, …)` + `scenarios (id, user_id,
client_id, name, is_base, payload jsonb, …)` — the full Plan lives in `payload`, one row per
persona per user (`unique(user_id, client_id)` → idempotent upsert). Identity is the advisor's
name/funcional (no OAuth).

### Provision on Vercel (one-time, ~2 min)

1. Vercel → your project → **Storage** → **Create Database** → **Marketplace** → **Neon** → connect.
   It injects `DATABASE_URL` automatically into all environments.
2. **Redeploy** so the deployment picks up the new env var.

### Run the migration

`DATABASE_URL` points at the same Neon DB for local and prod, so migrate once from your machine:

```bash
# paste Neon's pooled connection string into .env.local as DATABASE_URL, then:
npm run db:migrate
```

The runner (`scripts/migrate.mjs`) applies `migrations/*.sql` in order, tracks what's applied in
`schema_migrations`, and is safe to re-run.

---

## Demo gate (password screen)

Every route — pages AND APIs (`/api/scenarios`, `/api/advisor`, `/api/plano-ideal`)
— sits behind a black password screen, enforced **server-side** by `proxy.ts`
(Next 16's renamed middleware): no cookie → pages are rewritten to `/gate`
(no prototype HTML is served) and APIs return 401. The password lives ONLY in
the `GATE_PASSWORD` env var (set it in `.env.local` and in the Vercel project
envs); the cookie stores a non-reversible SHA-256 token, `httpOnly`,
`sameSite=lax`, `secure` on HTTPS, 24h. **Without the env the gate is
DISARMED** (fail-open by design — a missing env must not brick the demo).

> ⚠️ Honesty note: this is a **demo gate** — it stops casual access to a
> public Preview link. It is NOT production authentication; the real Vision
> will use corporate auth. QA scripts authenticate via `golden/gate-helper.mjs`
> (reads the env / `.env.local`, never hardcoded).

---

## Demo video (~36s, no audio)

A fully automated pipeline records a short product demo of the prototype — Playwright
drives the scripted scenes (intro tab → pre-filled wizard → goals registration with the
3 mandatory locked goals → live drag of a life event → draggable retirement → "Plano
Ideal com a BIA") and ffmpeg assembles the final cut with brand cards and fades.
Output: `demo/out/demo_vision.mp4` (1080p, H.264, `yuv420p`, silent — drops straight
into PowerPoint).

```bash
npx next start -p 3010   # the pipeline records against a production build
npm run demo             # = demo:record (Playwright) + demo:build (ffmpeg)
```

Each scene carries an executive caption (a translucent pill at the bottom describing
what's being demonstrated) — the texts live in `demo/storyboard.json` (`caption` per
scene) and are overlaid at build time, so editing them only needs `npm run demo:build`.
Everything about pacing lives in `demo/storyboard.json` (timings, selectors, drag
years, per-scene speed) — tweak it and re-run; no code changes needed. Raw clips stay
in `demo/raw/` for re-cuts; `demo/build.mjs` re-assembles without re-recording. To use
official brand cards, drop `card-open.png` / `card-close.png` (1920×1080) into
`demo/assets/` — otherwise simple dark cards are generated. The "Plano Ideal" scene
calls the real API when `ANTHROPIC_API_KEY` is set (the dead waiting time is cut in the
edit); without a key it shows the offline heuristic.

---

## The flow

**Intake** (dossiers received from the bank) → **Simulate** (the scenario loop — create
& recalculate N scenarios, live) → **Handoff** (approve → cross-sell opportunities +
the outbound API payload → send to Salesforce).

The simulate loop is the centerpiece: what-if sliders (contribution, retirement age,
expected real return, inflation) recompute the projection and animate the KPIs
instantly; scenarios can be created, duplicated and compared. The received dossier is
editable in a side drawer and the simulation updates live. State persists across reloads.

Six seed dossiers span the segments and narratives: **Marcos** (Retail, over-indebted),
**Aline** (Retail, comeback), **Camila & Diego** (Prime, accumulation), **Fernanda**
(Principal, protection), **José Carlos** (Principal, decumulation) and **Patrícia**
(Private, post-liquidity). The **cross-sell engine** (`lib/cross-sell.ts`) derives ranked
product opportunities from each plan's signals, grounded in the Bradesco product map.

---

## Client 360 + Life Planning (2-tab client record · v9)

Each **seed persona** carries a KYC "Conheça seu Cliente" dossier (9 categories,
in `lib/mock/kyc.ts`). When a client record is open it shows a **2-tab
navigation** at the top:

- **Cliente 360** (`components/engine/client-360-page.tsx`) — a full-page dossier
  (6 sections: summary, identification, relationship, personal & family, assets &
  international, cash flow & alerts) + an engine-KPI footer. (v8 surfaced this as
  a modal; v9 promoted it to a first-class tab.)
- **Life Planning** — the simulator/planning workspace (timeline, KPIs, Plano
  Ideal, Output) — unchanged.

Switching tabs **preserves both panels' state** (the simulator is not unmounted),
and the active tab is remembered **per client**.

- **Gate by data presence**: the **"Cliente 360" tab renders only when the active
  case has `clientProfile.kyc`**. Cases created from scratch never carry KYC, so
  the tab is simply absent and the record opens straight into Life Planning —
  that presence check IS the demo mechanism. Default tab when KYC is present:
  **Cliente 360** (context before simulating).
- **Static mock data, no AI**: the dossiers (including the "BIA summaries") are
  pre-written illustrative data shown with an "exemplo ilustrativo" badge — the
  360 makes **zero** API calls.
- **Privacy (Rule Zero)**: KYC **never** reaches the BIA. `buildPlanoIdealPayload`
  is an inclusion whitelist (numbers/booleans only); a test in
  `lib/__tests__/plano-ideal.test.ts` sweeps every persona to prove no KYC field
  or value leaks into the payload.
- **Plan numbers from the engine**: the page's expense comparison (declared-KYC ×
  plan) and the footer's 4 KPIs come from `cashFlowTotals` / `projectPlan` (same
  source as the workspace) — no arithmetic in the component.
- **i18n**: UI labels are bilingual (`vision360` + `clientTabs` namespaces,
  EN/PT). The dossier **content** stays in PT on purpose (it's data, not UI).

---

## Project structure

```
app/
  api/advisor/route.ts      # Anthropic streaming endpoint (server-only key)
  layout.tsx                # fonts (Hanken Grotesk + Fraunces), providers
  providers.tsx             # next-intl + Tooltip + Toaster + MotionConfig
  page.tsx                  # splash -> entry -> journey switch
  globals.css               # design tokens (Bradesco red, finance semantics)
components/
  app/                      # brand mark, top bar, locale toggle, Money, inputs
  journey/                  # stepper, shell, step-router, + steps/*
  charts/                   # Recharts wrappers (cashflow, networth, wealth, ...)
  advisor-copilot/          # the copilot chat panel
  ui/                       # shadcn components
lib/
  types.ts                  # the domain model (FSC-flavoured)
  calc.ts                   # pure financial math (projection, suitability, ...)
  plan.ts                   # plan helpers (blank plan, completeness, projectPlan)
  journey.ts                # step order & completion
  format.ts                 # locale-aware BRL / number / date formatting
  api/
    fsc.ts                  # Salesforce FSC stub (typed contracts + mock)
    planning-engine.ts      # aixigo/ALTO stub (typed contracts + mock)
  store/plan-store.ts       # Zustand store (+ persist)
  mock/clients.ts           # seed persona clients
  i18n/messages.ts          # message catalog map
messages/
  en.json  pt-BR.json       # UI strings (no hardcoded copy in components)
```

### Mock data & the swappable API layer

- **Seed clients** live in [`lib/mock/clients.ts`](lib/mock/clients.ts) as `Plan`
  objects. Add or edit clients there — the rest of the app only depends on the `Plan`
  shape in [`lib/types.ts`](lib/types.ts).
- **Service stubs** in `lib/api` are typed contracts with mock implementations that
  return promises with small artificial latency:
  - [`fsc.ts`](lib/api/fsc.ts) — `FscService` (list clients, get/save plan).
  - [`planning-engine.ts`](lib/api/planning-engine.ts) — `PlanningEngine`
    (`runProjection`, `computeSuitability`).
  - Going live is a **single-file swap per service**: replace the exported `fsc` /
    `planningEngine` binding with an HTTP-backed implementation of the same interface.

---

## shadcn/ui

Initialised with:

```bash
npx shadcn@latest init -b radix -p nova
```

Components added (`npx shadcn@latest add <name>`):

`button` · `card` · `input` · `label` · `select` · `slider` · `tabs` · `badge` ·
`progress` · `sheet` · `dialog` · `separator` · `form` · `sonner` · `tooltip` ·
`accordion` · `avatar` · `scroll-area` · `radio-group` · `switch` · `table` ·
`textarea` · `dropdown-menu` · `skeleton` · `checkbox` · `popover`

---

## Design system

- **Brand**: Bradesco red `#CC092F` as a full token scale (`--brand-50 … --brand-950`),
  used with discipline for primary actions, active states and the progress indicator.
- **Finance semantics** are kept separate from the brand red: `--positive` (green),
  `--negative` (a distinct alert red, **not** the brand red), `--warning`, `--info`.
- **Type**: Hanken Grotesk (UI) + Fraunces (display), with tabular numerals on every
  financial figure so numbers align and update without jitter.
- **Dark premium default** ("simulation engine") with a subtle red/blue glow; the light
  theme stays as a re-themeable CSS-variable set. Animated KPI counters and fluid
  phase/scenario transitions via Framer Motion.

---

## Notes for later

- Steps 2–6 and the seed data are easy to refine against the reference database.
- Open Finance aggregation is out of scope for v1.
- The FSC and aixigo/ALTO integrations will replace the stub layer — keep the contracts
  in `lib/api` clean.

> Disclaimer: hypothetical personas, portfolios and figures, for prototype use only.
> Not investment, tax or legal advice.
