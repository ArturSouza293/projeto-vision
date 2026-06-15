/**
 * scripts/responsive-shots.mjs — verificação de responsividade.
 *
 * Para cada largura (phone/tablet/desktop) percorre as telas-chave do app,
 * tira screenshot e RODA UM DETECTOR DE OVERFLOW HORIZONTAL: lista os elementos
 * que vazam além da viewport (o sintoma nº1 de "não responsivo"). Sem isso o
 * screenshot esconde o scrollbar horizontal.
 *
 * Requer o app rodando (npx next start -p 3010). Saída em demo/narrate/tmp/resp/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { passGate } from "../golden/gate-helper.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "demo", "narrate", "tmp", "resp");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3010";

const WIDTHS = [
  { id: "phone", w: 360, h: 740 },
  { id: "tablet", w: 768, h: 1024 },
  { id: "laptop", w: 1024, h: 768 },
  { id: "desktop", w: 1280, h: 900 },
];
// Header collapses (overflow ⋮ menu) below this width; full desktop header at/above.
const HEADER_FULL_MIN = 1280;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lista elementos que vazam além da viewport (à direita ou à esquerda). */
const OVERFLOW_PROBE = () => {
  const docW = document.documentElement.clientWidth;
  const bad = [];
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right > docW + 1 || r.left < -1) {
      // ignora itens dentro de containers com overflow-x próprio (scroll honesto)
      let scrollableAncestor = false;
      let p = el.parentElement;
      while (p) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "auto" || ov === "scroll") { scrollableAncestor = true; break; }
        p = p.parentElement;
      }
      if (scrollableAncestor) continue;
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 70),
        right: Math.round(r.right),
        left: Math.round(r.left),
      });
    }
  }
  // dedup grosseiro por classe
  const seen = new Set();
  return bad.filter((b) => { const k = b.cls + b.right; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
};

async function probe(page, label, width) {
  const docDelta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const bad = await page.evaluate(OVERFLOW_PROBE);
  const tag = docDelta > 1 ? `⚠ OVERFLOW +${docDelta}px` : "ok";
  console.log(`  [${width.id} ${width.w}] ${label}: ${tag}`);
  if (bad.length) for (const b of bad) console.log(`      ↳ <${b.tag}> right=${b.right} "${b.cls}"`);
  return { label, width: width.id, docDelta, bad };
}

async function shot(page, name, width) {
  await page.screenshot({ path: path.join(OUT, `${width.id}_${name}.png`), fullPage: false });
}

async function run() {
  // app vivo?
  for (let i = 0; i < 30; i++) { try { const r = await fetch(BASE); if (r.status < 500) break; } catch {} await sleep(500); }
  const browser = await chromium.launch();
  const issues = [];

  // 0) Checagem funcional do GATE (sem bypass): senha errada barra, "horizonte" libera.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const pwd = page.locator('input[type="password"]');
    await pwd.waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "gate_screen.png") }).catch(() => {});
    await pwd.fill("errada");
    await page.keyboard.press("Enter");
    await sleep(500);
    const stillGated = await page.locator('input[type="password"]').count();
    await page.locator('input[type="password"]').fill("horizonte");
    await page.keyboard.press("Enter");
    await page.waitForSelector("input:not([type=password])", { timeout: 8000 }).catch(() => {});
    await sleep(600);
    const unlocked = (await page.locator('input[type="password"]').count()) === 0;
    console.log(`  [gate] senha errada barra: ${stillGated > 0 ? "OK" : "FALHA"}; "horizonte" libera: ${unlocked ? "OK" : "FALHA"}`);
    await ctx.close();
  }

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: width.w, height: width.h }, deviceScaleFactor: 1 });
    await passGate(ctx); // pré-libera o gate (testa as telas do app, não o gate)
    const page = await ctx.newPage();

    // 1) login
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input", { timeout: 15000 });
    issues.push(await probe(page, "login", width));
    await shot(page, "01_login", width);

    // entra
    await page.locator("input").first().fill("Artur");
    await page.keyboard.press("Enter");
    await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 15000 }).catch(() => {});

    // força PT
    await page.getByRole("button", { name: "PT", exact: true }).click({ force: true }).catch(() => {});
    await sleep(300);

    // 2) why-plan (intro)
    issues.push(await probe(page, "why-plan", width));
    await shot(page, "02_whyplan", width);

    // 3) abre persona camila-diego (tem KYC)
    await page.getByTestId("open-sidebar").click({ force: true });
    await page.waitForTimeout(400);
    issues.push(await probe(page, "sidebar", width));
    await shot(page, "03_sidebar", width);
    await page.getByTestId("persona-camila-diego").click({ force: true });

    // 4) v9 — persona seed abre na aba "Cliente 360" (página inteira). Screenshot dela.
    await page.waitForSelector('[data-testid="client-360"]', { timeout: 20000 });
    await page.waitForTimeout(700);
    issues.push(await probe(page, "client-360", width));
    await shot(page, "05_client360", width);

    // 5) troca para "Life Planning" (o simulador) e segue o resto das telas lá.
    await page.getByTestId("tab-life-planning").click({ force: true });
    await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
    await page.waitForTimeout(800);
    issues.push(await probe(page, "workspace", width));
    await shot(page, "04_workspace", width);

    // 6) Premissas (botão no painel de parâmetros)
    try {
      await page.getByRole("button", { name: /Premissas/i }).first().click({ force: true });
      await page.waitForTimeout(500);
      issues.push(await probe(page, "premises", width));
      await shot(page, "06_premises", width);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) { console.log(`  [${width.id}] premises skip: ${e.message.split("\n")[0]}`); }

    // 7) Evento customizado (paleta "+")
    try {
      await page.getByTestId("palette-custom").click({ force: true });
      await page.waitForSelector('[data-testid="peer-modal"]', { timeout: 6000 });
      await page.waitForTimeout(400);
      issues.push(await probe(page, "custom-event", width));
      await shot(page, "07_customevent", width);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) { console.log(`  [${width.id}] custom-event skip: ${e.message.split("\n")[0]}`); }

    // 8) Copilot (BIA)
    try {
      await page.getByRole("button", { name: /Bia|Copilot/i }).first().click({ force: true });
      await page.waitForTimeout(500);
      issues.push(await probe(page, "copilot", width));
      await shot(page, "08_copilot", width);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) { console.log(`  [${width.id}] copilot skip: ${e.message.split("\n")[0]}`); }

    // 9) Output / Entrega (troca de fase)
    try {
      await page.getByRole("button", { name: /Entrega|Handoff/i }).first().click({ force: true });
      await page.waitForTimeout(700);
      issues.push(await probe(page, "output", width));
      await shot(page, "09_output", width);
    } catch (e) { console.log(`  [${width.id}] output skip: ${e.message.split("\n")[0]}`); }

    await ctx.close();
  }

  await browser.close();

  const overflows = issues.filter((i) => i.docDelta > 1);
  console.log(`\n=== RESUMO === telas verificadas: ${issues.length}; com overflow: ${overflows.length}`);
  for (const o of overflows) console.log(`  ⚠ ${o.width} · ${o.label} (+${o.docDelta}px)`);
  console.log(`\nscreenshots em ${OUT}`);
  process.exit(overflows.length ? 2 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
