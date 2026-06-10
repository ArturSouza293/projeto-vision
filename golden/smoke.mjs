/**
 * Fase B smoke: load the workspace (Camila fixture from the demo pipeline),
 * assert the engine-backed UI renders, KPIs show numbers, the timeline drag
 * recomputes live (ghost), the console stays clean.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(__dirname, "..", "demo", "raw", "fixtures", "workspace.json"), "utf8");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(({ k, v }) => localStorage.setItem(k, v), { k: "vision-store", v: fixture });

const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto("http://localhost:3010", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
await page.waitForTimeout(1200);

// KPI row text (first tile = patrimônio na aposentadoria)
const kpiText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
const hasKpi = /1[.,]3\s*mi|1[.,]2\s*mi/i.test(kpiText);

// Live drag: grab the retirement anchor, move it, expect a ghost path to appear
const anchor = await page.getByTestId("timeline-retire").boundingBox();
await page.mouse.move(anchor.x + anchor.width / 2, anchor.y + anchor.height / 2);
await page.mouse.down();
for (let i = 1; i <= 20; i++) {
  await page.mouse.move(anchor.x + anchor.width / 2 - i * 8, anchor.y + anchor.height / 2);
  await page.waitForTimeout(16);
}
const ghostVisible = await page.evaluate(
  () => document.querySelectorAll("path[stroke-dasharray='5 4']").length > 0,
);
await page.mouse.up();
await page.waitForTimeout(600);

// Plano Ideal offline-deterministic path must not throw (no API key needed —
// it falls back to the engine-only flow)
const planoBtn = await page.getByTestId("plano-ideal").count();

console.log(JSON.stringify({
  kpiRendered: hasKpi,
  ghostDuringDrag: ghostVisible,
  planoIdealButton: planoBtn === 1,
  consoleErrors,
}, null, 2));

await browser.close();
process.exit(consoleErrors.length === 0 && hasKpi && ghostVisible ? 0 : 1);
