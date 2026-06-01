# Projeto Vision — Advisor Financial Planning Journey

A production-grade, **advisor-facing** financial-planning prototype for a Brazilian
wealth-management context (Bradesco / "Projeto Vision"). It guides a bank advisor
through a single fluid journey of building a client's financial plan, ending at the
approval of a simulated scenario — **pre-asset-allocation**.

Built to evolve into real software and later integrate with **Salesforce Financial
Services Cloud (FSC)** and the **aixigo / ALTO** planning engine, so the architecture,
typing and data/API layer are clean and swappable.

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

## The journey

`Entry (client selection)` → **Profile** → **Cash flow** → **Net worth** →
**Suitability** → **Life goals** → **Scenario simulation** → **Review & approval**.

The flow is fluid, not a gated wizard: the advisor can jump between steps via the
persistent stepper, state persists across reloads, and every input feeds live
computations and charts. The scenario step's what-if sliders (contribution, retirement
age, expected real return, inflation) recompute the projection instantly.

Four seed clients span the segments and narratives: **Camila & Diego** (Prime,
accumulation), **Fernanda** (Principal, protection), **José Carlos** (Principal,
decumulation) and **Patrícia** (Private, post-liquidity).

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
- Light theme, with dark-ready CSS-variable tokens already structured.

---

## Notes for later

- Steps 2–6 and the seed data are easy to refine against the reference database.
- Open Finance aggregation is out of scope for v1.
- The FSC and aixigo/ALTO integrations will replace the stub layer — keep the contracts
  in `lib/api` clean.

> Disclaimer: hypothetical personas, portfolios and figures, for prototype use only.
> Not investment, tax or legal advice.
