/**
 * demo/record.mjs — records each storyboard scene as a separate Playwright clip.
 *
 * v8: jornada completa (gate → porquê → cadastro → objetivos → timeline v6 →
 * aposentadoria → peers → planos A/B/C → Plano Ideal → Entrega/cross-sell).
 * Cada cena roda num contexto NOVO seedado por fixture de localStorage, com
 * cursor fake injetado (o vídeo do Playwright não mostra o ponteiro) e gate
 * autenticado via cookie (exceto a própria cena do gate, que o demonstra).
 * Drags da timeline v6 são por DELTA DE PIXELS (a faixa tem geometria própria).
 *
 * Tudo de ritmo/seletor vem do storyboard.json — itere lá.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { gatePassword, passGate } from "../golden/gate-helper.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(fs.readFileSync(path.join(__dirname, "storyboard.json"), "utf8"));
const RAW = path.join(__dirname, "raw");
const FIXTURES = path.join(RAW, "fixtures");
const STORE_KEY = "vision-store";

fs.mkdirSync(FIXTURES, { recursive: true });

/* ---------------------------------------------------------------- cursor */
const CURSOR_SCRIPT = `(() => {
  if (window.__demoCursor) return; window.__demoCursor = true;
  function ensure() {
    let c = document.getElementById("__demo_cursor");
    if (!c && document.body) {
      c = document.createElement("div");
      c.id = "__demo_cursor";
      Object.assign(c.style, {
        position: "fixed", left: "-40px", top: "-40px", width: "16px", height: "16px",
        borderRadius: "50%", background: "rgba(35,35,40,0.45)",
        border: "2px solid rgba(255,255,255,0.95)", boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
        pointerEvents: "none", zIndex: "2147483647", transform: "translate(-50%,-50%)",
        transition: "left 50ms linear, top 50ms linear",
      });
      document.body.appendChild(c);
    }
    return c;
  }
  window.addEventListener("pointermove", (e) => {
    const c = ensure();
    if (c) { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }
  }, true);
  window.addEventListener("pointerdown", (e) => {
    const c = ensure();
    if (!c) return;
    c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px";
    c.style.background = "rgba(206,42,71,0.6)";
    c.animate(
      [{ boxShadow: "0 0 0 0 rgba(206,42,71,0.5)" }, { boxShadow: "0 0 0 16px rgba(206,42,71,0)" }],
      { duration: 380, easing: "ease-out" },
    );
  }, true);
  window.addEventListener("pointerup", () => {
    const c = ensure();
    if (c) c.style.background = "rgba(35,35,40,0.45)";
  }, true);
})();`;

/* ---------------------------------------------------------------- helpers */
const sleep = (page, ms) => page.waitForTimeout(ms);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

async function humanMove(page, from, to, ms) {
  const steps = Math.max(6, Math.round(ms / 28));
  for (let i = 1; i <= steps; i++) {
    const k = easeInOut(i / steps);
    await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    const wait = ms / steps - 11;
    if (wait > 1) await page.waitForTimeout(wait);
  }
}

let cursorAt = { x: 80, y: 80 };
async function moveTo(page, x, y, ms = 450) {
  await humanMove(page, cursorAt, { x, y }, ms);
  cursorAt = { x, y };
}
async function clickAt(page, x, y, ms = 450) {
  await moveTo(page, x, y, ms);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
}
async function clickTestId(page, id, ms = 450) {
  const box = await page.getByTestId(id).boundingBox();
  if (!box) throw new Error(`No bounding box for [data-testid=${id}]`);
  await clickAt(page, box.x + box.width / 2, box.y + box.height / 2, ms);
}
async function humanDrag(page, to, ms) {
  await page.mouse.down();
  await page.waitForTimeout(120);
  await humanMove(page, cursorAt, to, ms);
  cursorAt = to;
  await page.waitForTimeout(150);
  await page.mouse.up();
}

/** Arrasta um elemento (chip/marco da timeline v6) por um delta de pixels. */
async function dragByPx(page, testId, deltaPx, ms) {
  const box = await page.getByTestId(testId).boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await moveTo(page, cx, cy, 420);
  await humanDrag(page, { x: cx + deltaPx, y: cy }, ms);
}

async function scrollTrackTo(page, targetY) {
  await page.getByTestId("timeline-track").evaluate((el, ty) => {
    window.scrollBy({ top: el.getBoundingClientRect().top - ty, behavior: "instant" });
  }, targetY);
  await page.waitForTimeout(450);
}

/** Fecha o painel de edição se estiver aberto (clique em chip = toggle). */
async function closeEditorIfOpen(page) {
  const btn = page.getByTestId("event-editor-close");
  if (await btn.isVisible().catch(() => false)) {
    await clickTestId(page, "event-editor-close", 300);
    await page.waitForTimeout(200);
  }
}

/* -------------------------------------------------------------- fixtures */
async function prepareFixtures(browser) {
  console.log("• preparing localStorage fixtures (non-recorded pass)…");
  const ctx = await browser.newContext({ viewport: SB.viewport });
  await passGate(ctx, SB.baseUrl);
  const page = await ctx.newPage();
  await page.goto(SB.baseUrl, { waitUntil: "domcontentloaded" });

  await page.locator("input").first().fill(SB.advisorName);
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 15000 });

  const dump = async () => {
    const raw = await page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
    const obj = JSON.parse(raw);
    obj.state.locale = SB.locale;
    return obj;
  };

  fs.writeFileSync(path.join(FIXTURES, "intro.json"), JSON.stringify(await dump()));

  await page.getByTestId("open-sidebar").click();
  await page.getByTestId(`persona-${SB.personaId}`).click();
  await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
  await page.waitForTimeout(1500);

  fs.writeFileSync(path.join(FIXTURES, "workspace.json"), JSON.stringify(await dump()));
  await ctx.close();
  console.log("  fixtures ready: intro, workspace");
}

/* ---------------------------------------------------------------- scenes */
const SCENE_FNS = {
  /** Cena 0 — gate: digita a senha (mascarada) e entra. */
  async gate(page, p, mark) {
    await page.waitForSelector("input[type=password]", { timeout: 15000 });
    await sleep(page, 500);
    mark("action");
    const box = await page.locator("input[type=password]").boundingBox();
    await clickAt(page, box.x + box.width / 2, box.y + box.height / 2, 500);
    await page.keyboard.type(gatePassword() ?? "", { delay: p.typeDelay });
    await sleep(page, 250);
    await page.keyboard.press("Enter");
    await sleep(page, p.afterEnter); // recarrega → login do advisor aparece
    mark("end");
  },

  async why(page, p, mark) {
    await page.waitForSelector('[data-testid="why-card-c1"]');
    await sleep(page, 400);
    mark("action");
    await clickTestId(page, p.expandCard, 600);
    await sleep(page, p.readPause);
    const box = await page.getByTestId(p.expandCard).boundingBox();
    if (box) await moveTo(page, box.x + box.width * 0.5, box.y + box.height + 90, p.driftMs);
    await sleep(page, 300);
    mark("end");
  },

  async wizard(page, p, mark) {
    await page.waitForSelector(`[data-testid="${p.openSelector}"]`);
    await sleep(page, 300);
    mark("action");
    await clickTestId(page, p.openSelector, 550);
    await page.waitForSelector(`[data-testid="${p.firstTabSelector}"]`);
    await sleep(page, p.tabPause);
    for (let i = 0; i < p.tabCount; i++) {
      await clickTestId(page, p.nextSelector, 380);
      await sleep(page, p.tabPause);
    }
    mark("end");
  },

  async goals(page, p, mark) {
    await page.waitForSelector(`[data-testid="${p.openSelector}"]`);
    await sleep(page, 300);
    mark("action");
    await clickTestId(page, p.openSelector, 500);
    await page.waitForSelector(`[data-testid="${p.goalsTabSelector}"]`);
    await clickTestId(page, p.goalsTabSelector, 480);
    await page.waitForSelector('[data-testid="goals-add"]');
    await sleep(page, p.readPause);
    await clickTestId(page, "goals-add", 480);
    await page.waitForSelector(`[data-testid="goal-add-${p.addType}"]`);
    await sleep(page, p.menuPause);
    await clickTestId(page, `goal-add-${p.addType}`, 420);
    await sleep(page, p.settle);
    mark("end");
  },

  /** Cena 4 — timeline v6: drop de evento + drag por pixels (lanes + ghost). */
  async timeline(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-track"]');
    await scrollTrackTo(page, p.trackViewportY);
    mark("action");

    await clickTestId(page, `palette-${p.preset}`, 480);
    await page.waitForSelector('[data-testid="event-editor-close"]');
    await sleep(page, p.editorPause); // painel inline (nome/tipo/valor/ano)
    await clickTestId(page, "event-editor-close", 320);
    await sleep(page, 250);

    await dragByPx(page, `timeline-event-${p.preset}`, p.dragPx, p.dragMs);
    await closeEditorIfOpen(page);
    await sleep(page, p.settleAfterDrop);
    mark("drag2");
    await dragByPx(page, `timeline-event-${p.preset}`, p.earlierPx, p.earlierDragMs);
    await closeEditorIfOpen(page);
    await sleep(page, p.settleAfterDrop);
    mark("end");
  },

  /** Cena 5 — marco da aposentadoria (âncora real). */
  async retire(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-retire"]');
    await scrollTrackTo(page, p.trackViewportY);
    mark("action");
    await dragByPx(page, "timeline-retire", p.dragPx, p.dragMs);
    await closeEditorIfOpen(page);
    await sleep(page, p.settleAfterDrop);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(page, 700);
    await sleep(page, p.kpiPause);
    mark("end");
  },

  /** Cena 6 — peer insights: sugestões → 2 eventos no plano. */
  async peers(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-track"]');
    await scrollTrackTo(page, p.trackViewportY);
    mark("action");
    await clickTestId(page, "palette-custom", 500);
    await page.waitForSelector('[data-testid="peer-modal"]');
    await sleep(page, p.modalPause); // chips do perfil + cards
    const cards = page.locator('[data-testid^="peer-card-"]');
    for (const i of [0, 1]) {
      const btn = cards.nth(i).locator("button").last();
      const bb = await btn.boundingBox();
      await clickAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2, 420);
      await sleep(page, p.selectPause);
    }
    await clickTestId(page, "peer-apply", 480);
    await sleep(page, p.applySettle); // eventos pré-preenchidos + curva reage
    mark("end");
  },

  /** Cena 7 — planos A/B/C: duplicar, divergir, comparar. */
  async planos(page, p, mark) {
    await page.waitForSelector('[data-testid="variant-duplicate"]');
    await sleep(page, 300);
    mark("action");
    await clickTestId(page, "variant-duplicate", 480); // cria A + B (ativa B)
    await sleep(page, 450);
    await scrollTrackTo(page, p.trackViewportY);
    await dragByPx(page, "timeline-retire", p.dragPx, p.dragMs); // B diverge
    await closeEditorIfOpen(page);
    await sleep(page, 450);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await sleep(page, 300);
    await clickTestId(page, "variant-duplicate", 380); // C a partir de B
    await sleep(page, 300);
    await clickTestId(page, "variant-compare", 420);
    await page.waitForSelector('[data-testid="plan-summary"]');
    const col = await page.getByTestId("plan-summary").boundingBox();
    if (col) await moveTo(page, col.x + col.width * 0.5, col.y + col.height * 0.45, 600);
    await sleep(page, p.comparePause); // colunas, esgota-em, deltas
    mark("end");
  },

  async ideal(page, p, mark) {
    await page.waitForSelector('[data-testid="plano-ideal"]');
    await page.getByTestId("plano-ideal").evaluate((el) => {
      window.scrollBy({ top: el.getBoundingClientRect().top - 760, behavior: "instant" });
    });
    await sleep(page, 450);
    mark("action");
    await clickTestId(page, "plano-ideal", 500);
    mark("clicked");
    await page.waitForSelector('[data-testid="plano-ideal-racional"]', { timeout: p.apiTimeout });
    mark("result");
    const card = await page.getByTestId("plano-ideal-racional").boundingBox();
    if (card) await moveTo(page, card.x + card.width * 0.4, card.y + card.height * 0.6, 550);
    await sleep(page, p.resultHold);
    mark("end");
  },

  /** Cena 9 — Entrega: eventos viram oportunidades com origem. */
  async entrega(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-track"]');
    await scrollTrackTo(page, p.trackViewportY);
    mark("action");
    for (const preset of p.presets) {
      await clickTestId(page, `palette-${preset}`, 380);
      await sleep(page, 200);
      await closeEditorIfOpen(page);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await sleep(page, 300);
    const entregaBtn = page.locator("header button", { hasText: /Entrega|Handoff/ }).first();
    const bb = await entregaBtn.boundingBox();
    await clickAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2, 500);
    await sleep(page, 1200); // cards de cross-sell com origem do sinal
    const origem = page.locator("text=/derivada do evento/i").first();
    const ob = await origem.boundingBox().catch(() => null);
    if (ob) await moveTo(page, ob.x + 60, ob.y + 6, 600);
    await sleep(page, p.cardsPause);
    mark("end");
  },
};

/** Cut segments per scene (seconds, relative to recording start). */
function segmentsFor(scene, m) {
  const lead = 0.35, tail = 0.25;
  if (scene.id === "ideal") {
    return [
      { from: Math.max(0.05, m.action - lead), to: m.clicked + scene.params.loadingKeepSeconds, speed: 1 },
      { from: m.result - 0.45, to: m.end + tail, speed: 1 },
    ];
  }
  return [{ from: Math.max(0.05, m.action - lead), to: m.end + tail, speed: scene.speed ?? 1 }];
}

/* ----------------------------------------------------------------- runner */
async function recordScene(browser, scene) {
  console.log(`• recording scene "${scene.id}"…`);
  const ctx = await browser.newContext({
    viewport: SB.viewport,
    recordVideo: { dir: RAW, size: SB.viewport },
  });
  if (scene.id !== "gate") await passGate(ctx, SB.baseUrl); // a cena do gate o DEMONSTRA
  if (scene.fixture && scene.fixture !== "none") {
    const fixture = fs.readFileSync(path.join(FIXTURES, `${scene.fixture}.json`), "utf8");
    await ctx.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: STORE_KEY,
      value: fixture,
    });
  }
  await ctx.addInitScript(CURSOR_SCRIPT);

  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const mark = (name) => (marks[name] = (Date.now() - t0) / 1000);

  cursorAt = { x: 100, y: 120 };
  await page.goto(SB.baseUrl, { waitUntil: "domcontentloaded" });
  await page.mouse.move(cursorAt.x, cursorAt.y);

  try {
    await SCENE_FNS[scene.id](page, scene.params, mark);
  } catch (err) {
    await ctx.close();
    throw new Error(`Scene "${scene.id}" failed: ${err.message}`);
  }
  await sleep(page, 300);

  const video = page.video();
  await ctx.close();
  const file = path.join(RAW, `scene-${scene.id}.webm`);
  await video.saveAs(file);
  await video.delete().catch(() => {});

  const meta = { id: scene.id, file, marks, segments: segmentsFor(scene, marks) };
  fs.writeFileSync(path.join(RAW, `scene-${scene.id}.meta.json`), JSON.stringify(meta, null, 2));
  console.log(`  ✓ ${path.basename(file)} marks=${JSON.stringify(marks)}`);
}

async function main() {
  try {
    const res = await fetch(`${SB.baseUrl}/gate`, { redirect: "manual" });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch {
    console.error(`✗ App not reachable at ${SB.baseUrl} — start it first (npx next start -p 3010).`);
    process.exit(1);
  }

  const only = process.argv.includes("--scene") ? process.argv[process.argv.indexOf("--scene") + 1] : null;
  const browser = await chromium.launch();
  try {
    if (!only || !fs.existsSync(path.join(FIXTURES, "workspace.json"))) await prepareFixtures(browser);
    for (const scene of SB.scenes) {
      if (only && scene.id !== only) continue;
      await recordScene(browser, scene);
    }
  } finally {
    await browser.close();
  }
  console.log("✓ all scenes recorded → demo/raw/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
