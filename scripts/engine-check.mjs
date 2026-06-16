/**
 * Verificação ponta a ponta da integração: app (Next) → /api/engine (proxy
 * server-side) → motor Python (FastAPI). Requer o app rodando com
 * ENGINE_API_URL apontando para o motor, e o motor no ar.
 */
import { chromium } from "playwright";
import { passGate } from "../golden/gate-helper.mjs";

const BASE = "http://localhost:3010";
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(BASE); if (r.status < 500) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await passGate(ctx);
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator("input").first().fill("Artur");
await page.keyboard.press("Enter");
await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 15000 });
await page.getByRole("button", { name: "PT", exact: true }).click({ force: true }).catch(() => {});
await page.getByTestId("open-sidebar").click({ force: true });
await page.getByTestId("persona-camila-diego").click({ force: true });
await page.waitForSelector('[data-testid="client-360"]', { timeout: 20000 });

await page.getByTestId("engine-compute").scrollIntoViewIfNeeded();
await page.getByTestId("engine-compute").click({ force: true });
await page.waitForSelector('[data-testid="engine-result"]', { timeout: 15000 });
const txt = await page.getByTestId("engine-result").innerText();
console.log("--- engine-result ---\n" + txt + "\n---");
await page.screenshot({ path: "demo/narrate/tmp/engine_card.png" });
await browser.close();

const ok = /R\$/.test(txt) && /(macro|irpf|ir_investimentos)@\d{4}/.test(txt);
console.log(ok ? "ENGINE INTEGRATION OK" : "ENGINE INTEGRATION FAIL");
process.exit(ok ? 0 : 1);
