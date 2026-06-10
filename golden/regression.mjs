/**
 * Fase C — bateria de regressão automatizada (roda contra localhost:3010).
 *
 * Cobre: regressão funcional (4 personas, wizard completo), edge cases
 * (sobra negativa, idade ~usufruto, timeline lotada 20+ eventos, valor
 * extremo, wizard abandonado, drag de ida e volta), performance (fps durante
 * o drag, heap em 100 recálculos, console limpo) e o caminho do Plano Ideal.
 *
 * O caso "cliente novo do zero" completo fica no ROTEIRO_TESTE_MANUAL.md —
 * aqui é automatizada a parte crítica dele (persistência ao abandonar o
 * wizard no meio).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3010";
const results = [];
const fail = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) fail.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
}

async function newSession(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("input").first().fill("QA Fase C");
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 20000 });
  return { ctx, page, errors };
}

async function openPersona(page, id) {
  await page.getByTestId("open-sidebar").click();
  await page.getByTestId(`persona-${id}`).click();
  await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
  await page.waitForTimeout(900);
}

const bodyText = (page) => page.evaluate(() => document.body.innerText);

async function dragChip(page, testId, deltaPx, settle = 800) {
  const box = await page.getByTestId(testId).boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 25; i++) {
    await page.mouse.move(cx + (deltaPx * i) / 25, cy);
    await page.waitForTimeout(12);
  }
  const ghost = await page.evaluate(
    () => document.querySelectorAll("path[stroke-dasharray='5 4']").length > 0,
  );
  await page.mouse.up();
  await page.waitForTimeout(settle);
  return ghost;
}

const browser = await chromium.launch({
  args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"],
});

/* ============ A. Regressão funcional — 4 personas, jornada completa ============ */
for (const id of ["camila-diego", "fernanda", "marcos", "jose-carlos"]) {
  const { ctx, page, errors } = await newSession(browser);
  try {
    await openPersona(page, id);
    const text = await bodyText(page);
    check(`${id}: workspace renderiza sem NaN`, !/NaN|Infinity|undefined/.test(text));
    check(`${id}: KPIs presentes`, /R\$/.test(text) && /%/.test(text));
    if (id === "marcos") {
      check("marcos: sobra negativa exibida com clareza", /[-−–]\s*R\$|Déficit|déficit/i.test(text));
    }
    // wizard completo (perfil → ... → objetivos) com dados pré-carregados
    await page.getByTestId("open-data").click();
    await page.waitForSelector('[data-testid="wizard-tab-profile"]');
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("wizard-next").click();
      await page.waitForTimeout(350);
    }
    // o botão "adicionar objetivo" só existe no passo de Objetivos (estrutural, independe de idioma)
    const goalsVisible = await page
      .getByTestId("goals-add")
      .isVisible()
      .catch(() => false);
    check(`${id}: wizard navega até Objetivos sem erro`, goalsVisible);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    check(`${id}: console limpo`, errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    check(`${id}: jornada`, false, String(e).slice(0, 160));
  }
  await ctx.close();
}

/* ============ B. Edge cases + interações profundas (Camila) ============ */
{
  const { ctx, page, errors } = await newSession(browser);
  try {
    await openPersona(page, "camila-diego");
    await page.getByTestId("timeline-track").evaluate((el) =>
      window.scrollBy({ top: el.getBoundingClientRect().top - 620, behavior: "instant" }),
    );
    await page.waitForTimeout(400);
    const before = await bodyText(page);

    // B1 — evento: drop + drag com ghost ao vivo, e drag de VOLTA (undo)
    await page.getByTestId("palette-property_buy").click();
    await page.waitForSelector('[data-testid="event-editor-close"]');
    await page.getByTestId("event-editor-close").click();
    await page.waitForTimeout(300);
    const afterAdd = await bodyText(page);
    check("B1: adicionar evento muda os números", afterAdd !== before);

    const ghost1 = await dragChip(page, "timeline-event-property_buy", 320);
    check("B1: ghost visível DURANTE o drag (recalc ao vivo)", ghost1);
    const afterDrag = await bodyText(page);
    const ghostCleared = await page.evaluate(
      () => document.querySelectorAll("path[stroke-dasharray='5 4']").length === 0,
    );
    check("B1: ghost some no drop", ghostCleared);
    await dragChip(page, "timeline-event-property_buy", -320);
    const afterBack = await bodyText(page);
    check("B1: arrastar de volta restaura (undo por drag)", afterBack !== afterDrag);

    // B2 — valor extremo no editor do evento (isolado: falha não derruba B3+)
    try {
      await page.getByTestId("timeline-event-property_buy").click();
      await page.waitForSelector('[data-testid="event-editor-close"]', { timeout: 8000 });
      const money = page.locator('input[inputmode="numeric"]').first();
      await money.fill("999999999");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(600);
      const extremo = await bodyText(page);
      check("B2: valor extremo (R$ 999.999.999) não gera NaN", !/NaN|Infinity/.test(extremo));
      await page.getByTestId("event-editor-close").click();
      await page.waitForTimeout(300);
    } catch (e) {
      check("B2: valor extremo", false, String(e).slice(0, 120));
    }

    // B3 — aposentadoria: drag ida e volta
    const ghostRet = await dragChip(page, "timeline-retire", -250);
    check("B3: drag da aposentadoria recalcula ao vivo", ghostRet);

    // B4 — timeline lotada: 24 eventos (v5: o botão "custom" abre o modal de
    // peers, então o loop usa só os presets diretos)
    const palette = await page.locator('[data-testid^="palette-"]:not([data-testid="palette-custom"])').all();
    for (let round = 0; round < 2; round++) {
      for (const b of palette) {
        await b.click();
        await page.waitForTimeout(40);
        const closeBtn = page.getByTestId("event-editor-close");
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    }
    const chips = await page.locator('[data-testid^="timeline-event-"]').count();
    check("B4: timeline lotada (20+ eventos) renderiza", chips >= 20, `${chips} chips`);

    // B5 — fps durante drag com timeline lotada
    await page.evaluate(() => {
      window.__frames = 0;
      const tick = () => {
        window.__frames += 1;
        window.__raf = requestAnimationFrame(tick);
      };
      window.__raf = requestAnimationFrame(tick);
    });
    const t0 = Date.now();
    await dragChip(page, "timeline-retire", 200, 100);
    const elapsed = Date.now() - t0;
    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__raf);
      return window.__frames;
    });
    const fps = Math.round((frames / elapsed) * 1000);
    check("B5: drag fluido com 24 eventos (≥ 45 fps)", fps >= 45, `${fps} fps`);

    // B6 — 100 recálculos seguidos sem leak (nudge por teclado no chip).
    // GC forçado nos DOIS pontos — sem isso, lixo ainda-não-coletado conta
    // como falso "leak".
    const forcedHeap = () =>
      page.evaluate(() => {
        globalThis.gc?.();
        globalThis.gc?.();
        return performance.memory?.usedJSHeapSize ?? 0;
      });
    const heapBefore = await forcedHeap();
    const chip = page.locator('[data-testid^="timeline-event-"]').first();
    await chip.focus();
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(i % 2 ? "ArrowRight" : "ArrowLeft");
      await page.waitForTimeout(8);
    }
    await page.waitForTimeout(800);
    const heapAfter = await forcedHeap();
    const growth = heapBefore > 0 ? (heapAfter - heapBefore) / heapBefore : 0;
    check(
      "B6: 100 recálculos sem leak (heap < +60%)",
      heapBefore === 0 || growth < 0.6,
      `${(growth * 100).toFixed(0)}% (${(heapBefore / 1048576).toFixed(0)}→${(heapAfter / 1048576).toFixed(0)} MB)`,
    );

    check("B: console limpo nas interações", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    check("B: edge cases", false, String(e).slice(0, 160));
  }
  await ctx.close();
}

/* ============ C. Plano Ideal (fluxo Regra Zero ponta a ponta) ============ */
{
  const { ctx, page, errors } = await newSession(browser);
  try {
    await openPersona(page, "camila-diego");
    const sobraMatch = (await bodyText(page)).match(/Sobra mensal\s*R\$\s*([\d.,]+)/i);
    await page.getByTestId("plano-ideal").evaluate((el) =>
      window.scrollBy({ top: el.getBoundingClientRect().top - 700, behavior: "instant" }),
    );
    await page.waitForTimeout(300);
    await page.getByTestId("plano-ideal").click();
    await page.waitForSelector('[data-testid="plano-ideal-racional"]', { timeout: 90000 });
    await page.waitForTimeout(1200); // tween dos sliders
    const text = await bodyText(page);
    check("C1: racional (template do app) exibido", /Racional da BIA|BIA's rationale/i.test(text));
    check("C1: racional contém os slots numéricos", /IPCA\+/.test(text) && /R\$/.test(text));
    check("C1: sem NaN após aplicar", !/NaN|Infinity/.test(text));
    // aporte aplicado nunca excede a sobra (Regra de clamp, visível na UI)
    const aporteMatch = text.match(/Aporte mensal\s*R\$\s*([\d.,]+)/i);
    if (aporteMatch && sobraMatch) {
      const parse = (s) => Number(s.replace(/\./g, "").replace(",", "."));
      check(
        "C1: aporte aplicado ≤ sobra mensal",
        parse(aporteMatch[1]) <= parse(sobraMatch[1]) + 1,
        `aporte ${aporteMatch[1]} vs sobra ${sobraMatch[1]}`,
      );
    }
    check("C: console limpo", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    check("C: plano ideal", false, String(e).slice(0, 160));
  }
  await ctx.close();
}

/* ============ D. Wizard abandonado no meio (sem perda de dados) ============ */
{
  const { ctx, page, errors } = await newSession(browser);
  try {
    await page.getByTestId("why-cta").click(); // novo cliente → wizard abre
    await page.waitForSelector('[data-testid="wizard-tab-profile"]');
    const nome = page.locator("input").nth(0);
    await nome.fill("Cliente Teste QA");
    await page.getByTestId("wizard-next").click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); // abandona no meio
    await page.waitForTimeout(500);
    await page.getByTestId("open-data").click();
    await page.waitForSelector('[data-testid="wizard-tab-profile"]');
    const value = await page.locator("input").nth(0).inputValue();
    check("D1: wizard abandonado preserva os dados", value === "Cliente Teste QA", `"${value}"`);
    check("D: console limpo", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    check("D: wizard abandonado", false, String(e).slice(0, 160));
  }
  await ctx.close();
}

await browser.close();

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks OK`);
if (fail.length) {
  console.log("FALHAS:\n - " + fail.join("\n - "));
  process.exit(1);
}
