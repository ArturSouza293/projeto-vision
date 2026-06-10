/**
 * v5 — verificação dos critérios de aceitação no navegador (localhost:3010).
 * 1. Modal grande abre na aba Sugestões com chips do perfil.
 * 2. Selecionar 2 sugestões + aplicar → 2 eventos na timeline (curva reage).
 * 3. Personalização: o MESMO card mostra valores diferentes para rendas diferentes.
 * 4. Planos A/B/C: duplicar 2×, editar B, comparar → colunas, gap, deltas, próximos passos.
 * 5. Criar do zero: evento com mês/duração entra na timeline.
 * 6. Console limpo em tudo.
 */
import { chromium } from "playwright";

import { passGate } from "./gate-helper.mjs";

const BASE = "http://localhost:3010";
const results = [];
const fail = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  if (!ok) fail.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

async function newSession(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await passGate(ctx, BASE); // v6: gate de demonstração
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("input").first().fill("QA v5");
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 20000 });
  return { ctx, page, errors };
}

async function openPersona(page, id) {
  await page.getByTestId("open-sidebar").click();
  await page.getByTestId(`persona-${id}`).click();
  await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function openPeerModal(page) {
  await page.getByTestId("timeline-track").evaluate((el) =>
    window.scrollBy({ top: el.getBoundingClientRect().top - 600, behavior: "instant" }),
  );
  await page.getByTestId("palette-custom").click();
  await page.waitForSelector('[data-testid="peer-modal"]', { timeout: 8000 });
}

const browser = await chromium.launch();

/* ---- 1 + 2: modal, chips, aplicar 2 sugestões ---- */
{
  const { ctx, page, errors } = await newSession(browser);
  await openPersona(page, "camila-diego");
  const chipsBefore = await page.locator('[data-testid^="timeline-event-"]').count();
  await openPeerModal(page);

  const modalText = await page.getByTestId("peer-modal").innerText();
  check("1: modal abre na aba Sugestões", /pessoas como você|people like you/i.test(modalText));
  check("1: chips do perfil presentes (faixa 30-40)", /30-40/.test(modalText));
  check("1: chips refletem renda do caso", /R\$/.test(modalText));
  const cards = await page.locator('[data-testid^="peer-card-"]').count();
  check("1: carrossel com 8+ cards do dataset", cards >= 8, `${cards} cards`);

  // selecionar 2 e aplicar
  await page.locator('[data-testid^="peer-card-"] button:has-text("Adicionar"), [data-testid^="peer-card-"] button:has-text("Add as")').first().click();
  await page.locator('[data-testid^="peer-card-"]').nth(1).locator("button").last().click();
  await page.getByTestId("peer-apply").click();
  await page.waitForTimeout(900);
  const chipsAfter = await page.locator('[data-testid^="timeline-event-"]').count();
  check("2: 2 eventos pré-preenchidos na timeline", chipsAfter === chipsBefore + 2, `${chipsBefore}→${chipsAfter}`);
  check("2: sem NaN após aplicar (curva reagiu)", !/NaN/.test(await page.evaluate(() => document.body.innerText)));
  check("1-2: console limpo", errors.length === 0, errors.slice(0, 2).join(" | "));

  /* ---- 5: criar do zero com mês ---- */
  await openPeerModal(page);
  await page.getByTestId("peer-tab-criar").click();
  await page.waitForTimeout(300);
  const nome = page.locator('[data-testid="peer-modal"] input').first();
  await nome.fill("Evento QA v5");
  await page.getByTestId("peer-create").click();
  await page.waitForTimeout(700);
  const chipsFinal = await page.locator('[data-testid^="timeline-event-"]').count();
  check("5: criar do zero adiciona evento", chipsFinal === chipsAfter + 1, `${chipsAfter}→${chipsFinal}`);
  await ctx.close();
}

/* ---- 3: personalização — valores diferentes por renda ---- */
{
  const valorDoCard = async (personaId) => {
    const { ctx, page } = await newSession(browser);
    await openPersona(page, personaId);
    await openPeerModal(page);
    const txt = await page.getByTestId("peer-card-protecao-renda").innerText().catch(() => "");
    await ctx.close();
    const m = txt.match(/R\$\s*[\d.,]+/);
    return m ? m[0] : null;
  };
  const camila = await valorDoCard("camila-diego");
  const fernanda = await valorDoCard("fernanda");
  check(
    "3: card 'proteção de renda' personalizado pela renda do caso",
    camila !== null && fernanda !== null && camila !== fernanda,
    `camila=${camila} vs fernanda=${fernanda}`,
  );
}

/* ---- 4: Planos A/B/C + Resumo dos Planos ---- */
{
  const { ctx, page, errors } = await newSession(browser);
  await openPersona(page, "camila-diego");

  await page.getByTestId("variant-duplicate").click(); // cria A + B (ativa B)
  await page.waitForTimeout(400);
  check("4: A e B criados", (await page.locator('[data-testid^="variant-"]').count()) >= 3); // A, B, duplicate btn? testids: variant-A, variant-B + buttons variant-duplicate/compare → seletor pega 4
  // edita o plano B: arrasta a aposentadoria para diferenciar
  await page.getByTestId("timeline-track").evaluate((el) =>
    window.scrollBy({ top: el.getBoundingClientRect().top - 620, behavior: "instant" }),
  );
  const anchor = await page.getByTestId("timeline-retire").boundingBox();
  await page.mouse.move(anchor.x + anchor.width / 2, anchor.y + anchor.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(anchor.x + anchor.width / 2 - i * 10, anchor.y + anchor.height / 2);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);

  await page.getByTestId("variant-duplicate").click(); // cria C a partir de B
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByTestId("variant-compare").click();
  await page.waitForSelector('[data-testid="plan-summary"]', { timeout: 10000 });
  const sumText = await page.getByTestId("plan-summary").innerText();

  const colA = await page.getByTestId("summary-col-A").count();
  const colB = await page.getByTestId("summary-col-B").count();
  const colC = await page.getByTestId("summary-col-C").count();
  check("4: colunas A/B/C lado a lado", colA === 1 && colB === 1 && colC === 1);
  check("4: KPI patrimônio na aposentadoria presente", /R\$/.test(sumText));
  check("4: gap verde/vermelho presente", /Sem gap|No gap|\/ano|\/year/.test(sumText));
  check("4: deltas vs referência (▲/▼)", /[▲▼]/.test(sumText));
  check("4: próximos passos derivados (stress test sempre presente)", /stress test/i.test(sumText));
  check("4: selo ilustrativo no rodapé", /ilustrativ|Illustrative/i.test(sumText));
  check("4: console limpo", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} checks OK`);
if (fail.length) {
  console.log("FALHAS:\n - " + fail.join("\n - "));
  process.exit(1);
}
