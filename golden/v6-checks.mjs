/**
 * v6 — checks de aceitação: redesign da timeline (lanes/painel) + gate.
 */
import { chromium } from "playwright";

import { gatePassword, passGate } from "./gate-helper.mjs";

const BASE = "http://localhost:3010";
const results = [];
const fail = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  if (!ok) fail.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

async function newSession(browser, withGate = true) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  if (withGate) await passGate(ctx, BASE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

const browser = await chromium.launch();

/* ---------- GATE (browser) ---------- */
{
  const { ctx, page } = await newSession(browser, false);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const bg = await page.evaluate(() => {
    const el = document.querySelector("div[style*='fixed']");
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  const text = await page.evaluate(() => document.body.innerText);
  check("G1: rota / sem cookie → tela preta do gate", bg === "rgb(0, 0, 0)", String(bg));
  check("G1: wordmark + linha institucional", /Projeto Vision/i.test(text) && /Acesso restrito/i.test(text));
  check("G1: nada do protótipo no DOM", !/bradesco|Camila|workspace/i.test(text));

  await page.locator("input[type=password]").fill("senha-errada");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  check("G2: senha errada → mensagem sutil", /Senha incorreta/.test(await page.evaluate(() => document.body.innerText)));

  await page.locator("input[type=password]").fill(gatePassword() ?? "");
  await page.keyboard.press("Enter");
  await page.waitForSelector("input:not([type=password])", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => document.body.innerText);
  check("G3: senha correta → protótipo carrega (login do advisor)", !/Acesso restrito/.test(after));
  await ctx.close();
}

/* ---------- TIMELINE (logado, Camila) ---------- */
{
  const { ctx, page, errors } = await newSession(browser);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("input").first().fill("QA v6");
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 20000 });
  await page.getByTestId("open-sidebar").click();
  await page.getByTestId("persona-camila-diego").click();
  await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.getByTestId("timeline-track").evaluate((el) =>
    window.scrollBy({ top: el.getBoundingClientRect().top - 480, behavior: "instant" }),
  );

  // T1 — 22+ eventos sem sobreposição de labels (lanes)
  const palette = await page
    .locator('[data-testid^="palette-"]:not([data-testid="palette-custom"])')
    .all();
  for (let round = 0; round < 2; round++) {
    for (const b of palette) {
      await b.click();
      await page.waitForTimeout(30);
      const closeBtn = page.getByTestId("event-editor-close");
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    }
  }
  await page.waitForTimeout(600);
  const boxes = [];
  for (const chip of await page.locator('[data-testid^="timeline-event-"]').all()) {
    const b = await chip.boundingBox();
    if (b) boxes.push(b);
  }
  check("T1: 20+ eventos renderizados", boxes.length >= 20, `${boxes.length} chips`);
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (x > 2 && y > 2) overlaps++;
    }
  }
  check("T1: ZERO sobreposição de labels", overlaps === 0, `${overlaps} colisões`);

  // T2 — lanes reorganizam AO VIVO durante o drag (top muda no meio do arrasto)
  const chip = page.locator('[data-testid^="timeline-event-"]').first();
  const start = await chip.boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  let laneChangedLive = false;
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(start.x + start.width / 2 + i * 14, start.y + start.height / 2);
    await page.waitForTimeout(14);
    const now = await chip.boundingBox();
    if (now && Math.abs(now.y - start.y) > 4) laneChangedLive = true;
  }
  const ghostLive = await page.evaluate(
    () => document.querySelectorAll("path[stroke-dasharray='5 4']").length > 0,
  );
  await page.mouse.up();
  await page.waitForTimeout(500);
  check("T2: lane do chip reorganiza DURANTE o arrasto", laneChangedLive);
  check("T2: ghost da curva ao vivo (motor por rAF)", ghostLive);

  // helper: abrir o painel de um chip de forma idempotente (clique = toggle)
  const panelVisible = () => page.getByTestId("event-editor-close").isVisible().catch(() => false);
  async function openPanel(locator) {
    if (await panelVisible()) {
      await page.getByTestId("event-editor-close").click();
      await page.waitForTimeout(250);
    }
    for (let i = 0; i < 3; i++) {
      await locator.click();
      await page.waitForTimeout(350);
      if (await panelVisible()) return true;
    }
    return false;
  }

  // T3 — painel inline: slider+input de ano sincronizados; Remover funciona
  check("T3: clique no chip abre o painel", await openPanel(chip));
  const slider = page.locator("input[type=range]").first();
  await slider.fill(String(new Date().getFullYear() + 12));
  await page.waitForTimeout(300);
  const numVal = await page.locator("input[type=number]").last().inputValue();
  check("T3: slider→input sincronizado", numVal === String(new Date().getFullYear() + 12), numVal);
  const before = await page.locator('[data-testid^="timeline-event-"]').count();
  await page.locator("button", { hasText: /Remover|Remove/ }).last().click();
  await page.waitForTimeout(400);
  const afterCount = await page.locator('[data-testid^="timeline-event-"]').count();
  check("T3: Remover exclui o evento", afterCount === before - 1, `${before}→${afterCount}`);

  // T4 — marco: clique abre painel do marco; drag continua âncora real
  check("T4: clique no marco abre painel de edição do marco", await openPanel(page.getByTestId("timeline-retire")));
  const painel = await page.evaluate(() => document.body.innerText);
  check("T4: painel é do MARCO", /Editar marco|Edit milestone/.test(painel));
  await page.getByTestId("event-editor-close").click();
  await page.waitForTimeout(250);

  // T5 — VIS-607: evento DEPOIS da aposentadoria é aceito
  await page.getByTestId("palette-travel").click();
  await page.waitForSelector('[data-testid="event-editor-close"]', { timeout: 8000 });
  const retYear = parseInt(
    (await page.getByTestId("timeline-retire").innerText()).match(/(\d{4})/)[1],
    10,
  );
  const sliderPos = page.locator("input[type=range]").first();
  await sliderPos.fill(String(retYear + 5));
  await page.waitForTimeout(500);
  const txt = await page.evaluate(() => document.body.innerText);
  check("T5: evento pós-aposentadoria aceito (VIS-607)", new RegExp(`${retYear + 5}`).test(txt));
  check("T5: sem NaN com evento no usufruto", !/NaN/.test(txt));
  await page.getByTestId("event-editor-close").click();

  check("T: console limpo", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} checks OK`);
if (fail.length) {
  console.log("FALHAS:\n - " + fail.join("\n - "));
  process.exit(1);
}
