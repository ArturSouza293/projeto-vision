/**
 * demo/record.mjs — records each storyboard scene as a separate Playwright clip.
 *
 * Flow: 1) prepare localStorage fixtures by driving the real app once (login /
 * load persona) in a non-recorded context; 2) record every scene in a FRESH
 * context seeded from its fixture, with a fake cursor overlay injected (the
 * Playwright video never shows the real pointer); 3) write raw/<scene>.webm +
 * raw/<scene>.meta.json (timing marks → cut segments) for build.mjs.
 *
 * All timings/selectors/params come from storyboard.json — iterate there.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(fs.readFileSync(path.join(__dirname, "storyboard.json"), "utf8"));
const RAW = path.join(__dirname, "raw");
const FIXTURES = path.join(RAW, "fixtures");
const STORE_KEY = "vision-store";

fs.mkdirSync(FIXTURES, { recursive: true });

/* ---------------------------------------------------------------- cursor */
/** Fake cursor: Playwright videos don't capture the pointer, so we draw one.
 *  Pointer events (not mouse) — the timeline calls preventDefault() on
 *  pointerdown, which suppresses compatibility mouse events mid-drag. */
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

/** Move the (virtual) mouse along an eased path over ~ms milliseconds.
 *  Per-step dispatch latency is real (~8-12ms), so the explicit wait is
 *  shortened to keep total time close to the nominal duration. */
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
/** Press at the cursor, drag with easing to (x,y), release. Slow enough for
 *  the live ghost curve to visibly track the movement. */
async function humanDrag(page, to, ms) {
  await page.mouse.down();
  await page.waitForTimeout(120);
  await humanMove(page, cursorAt, to, ms);
  cursorAt = to;
  await page.waitForTimeout(150);
  await page.mouse.up();
}

/** Timeline geometry: track box + [minYear, maxYear] from its corner labels. */
async function trackGeometry(page) {
  const track = page.getByTestId("timeline-track");
  const box = await track.boundingBox();
  const [minYear, maxYear] = await track.evaluate((el) => {
    const spans = el.querySelectorAll(":scope > span");
    return [parseInt(spans[0].textContent, 10), parseInt(spans[spans.length - 1].textContent, 10)];
  });
  return { box, minYear, maxYear, xFor: (y) => box.x + ((y - minYear) / (maxYear - minYear)) * box.width };
}

/** Scroll so the timeline track sits at ~targetY in the viewport. */
async function scrollTrackTo(page, targetY) {
  await page.getByTestId("timeline-track").evaluate((el, ty) => {
    window.scrollBy({ top: el.getBoundingClientRect().top - ty, behavior: "instant" });
  }, targetY);
  await page.waitForTimeout(450);
}

/* -------------------------------------------------------------- fixtures */
async function prepareFixtures(browser) {
  console.log("• preparing localStorage fixtures (non-recorded pass)…");
  const ctx = await browser.newContext({ viewport: SB.viewport });
  const page = await ctx.newPage();
  await page.goto(SB.baseUrl, { waitUntil: "domcontentloaded" });

  // Login (name-only gate)
  await page.locator("input").first().fill(SB.advisorName);
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-testid="why-card-c1"]', { timeout: 15000 });

  const dump = async () => {
    const raw = await page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
    const obj = JSON.parse(raw);
    obj.state.locale = SB.locale; // demo always runs in pt-BR
    return obj;
  };

  const intro = await dump();
  fs.writeFileSync(path.join(FIXTURES, "intro.json"), JSON.stringify(intro));

  // Load the demo persona → workspace (base scenario auto-created)
  await page.getByTestId("open-sidebar").click();
  await page.getByTestId(`persona-${SB.personaId}`).click();
  await page.waitForSelector('[data-testid="timeline-track"]', { timeout: 20000 });
  await page.waitForTimeout(1500); // ensureBaseScenario + projections settle

  const workspace = await dump();
  fs.writeFileSync(path.join(FIXTURES, "workspace.json"), JSON.stringify(workspace));
  await ctx.close();
  console.log("  fixtures ready: intro, workspace");
}

/* ---------------------------------------------------------------- scenes */
const SCENE_FNS = {
  /** Scene 1 — "Por que planejar?": expand one accordion card, reading pause. */
  async why(page, p, mark) {
    await page.waitForSelector('[data-testid="why-card-c1"]');
    await sleep(page, 400);
    mark("action");
    await clickTestId(page, p.expandCard, 600);
    await sleep(page, p.readPause);
    const box = await page.getByTestId(p.expandCard).boundingBox();
    if (box) await moveTo(page, box.x + box.width * 0.5, box.y + box.height + 90, p.driftMs); // drift over the answer
    await sleep(page, 300);
    mark("end");
  },

  /** Scene 2 — pre-filled wizard tour (sped up in the edit). */
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

  /** Scene 2b — the goals-registration journey: jump to the "Objetivos" tab
   *  (3 mandatory locked goals visible), then add a new goal from the menu —
   *  the new card drops in with the list's auto-scroll. */
  async goals(page, p, mark) {
    await page.waitForSelector(`[data-testid="${p.openSelector}"]`);
    await sleep(page, 300);
    mark("action");
    await clickTestId(page, p.openSelector, 500); // "Dados"
    await page.waitForSelector(`[data-testid="${p.goalsTabSelector}"]`);
    await clickTestId(page, p.goalsTabSelector, 480); // jump to "Objetivos"
    await page.waitForSelector('[data-testid="goals-add"]');
    await sleep(page, p.readPause); // mandatory goals (lock) on screen
    await clickTestId(page, "goals-add", 480);
    await page.waitForSelector(`[data-testid="goal-add-${p.addType}"]`);
    await sleep(page, p.menuPause);
    await clickTestId(page, `goal-add-${p.addType}`, 420);
    await sleep(page, p.settle); // new card appears + auto-scroll
    mark("end");
  },

  /** Scene 3 — drop a life event from the palette, drag it on the timeline
   *  (live ghost), then nudge it N years earlier. */
  async timeline(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-track"]');
    await scrollTrackTo(page, p.trackViewportY);
    mark("action");

    await clickTestId(page, `palette-${p.preset}`, 480);
    await page.waitForSelector('[data-testid="event-editor-close"]');
    await sleep(page, p.editorPause); // show the inline editor (label/valor/ano)
    await clickTestId(page, "event-editor-close", 320);
    await sleep(page, 250);

    const geo = await trackGeometry(page);
    const chip = await page.getByTestId(`timeline-event-${p.preset}`).boundingBox();
    await moveTo(page, chip.x + chip.width / 2, chip.y + chip.height / 2, 400);
    await humanDrag(page, { x: geo.xFor(p.dragToYear), y: cursorAt.y }, p.dragMs);
    await sleep(page, p.settleAfterDrop); // committed curve animates
    mark("drag2");

    const chip2 = await page.getByTestId(`timeline-event-${p.preset}`).boundingBox();
    await moveTo(page, chip2.x + chip2.width / 2, chip2.y + chip2.height / 2, 300);
    await humanDrag(page, { x: geo.xFor(p.dragToYear - p.earlierYears), y: cursorAt.y }, p.earlierDragMs);
    await sleep(page, p.settleAfterDrop);
    mark("end");
  },

  /** Scene 4 — drag the retirement anchor N years earlier; show recalc. */
  async retire(page, p, mark) {
    await page.waitForSelector('[data-testid="timeline-retire"]');
    await scrollTrackTo(page, p.trackViewportY);
    const label = await page.getByTestId("timeline-retire").innerText();
    const retYear = parseInt(label.match(/(\d{4})/)?.[1], 10);
    if (!retYear) throw new Error(`Could not parse retirement year from "${label}"`);
    mark("action");

    const geo = await trackGeometry(page);
    const anchor = await page.getByTestId("timeline-retire").boundingBox();
    await moveTo(page, anchor.x + anchor.width / 2, anchor.y + anchor.height / 2, 450);
    await humanDrag(page, { x: geo.xFor(retYear - p.yearsEarlier), y: cursorAt.y }, p.dragMs);
    await sleep(page, p.settleAfterDrop);

    if (p.scrollTopAfter) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(page, 700);
    }
    await sleep(page, p.kpiPause); // recalculated KPIs on screen
    mark("end");
  },

  /** Scene 5 — Plano Ideal (BIA): click → loading → sliders tween → racional.
   *  Raw recording keeps the WHOLE wait; build.mjs cuts the dead middle using
   *  the clicked/result marks. */
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
  const fixture = fs.readFileSync(path.join(FIXTURES, `${scene.fixture}.json`), "utf8");
  const ctx = await browser.newContext({
    viewport: SB.viewport,
    recordVideo: { dir: RAW, size: SB.viewport },
  });
  await ctx.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: STORE_KEY,
    value: fixture,
  });
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
  await ctx.close(); // finalizes the video file
  const file = path.join(RAW, `scene-${scene.id}.webm`);
  await video.saveAs(file);
  await video.delete().catch(() => {});

  const meta = { id: scene.id, file, marks, segments: segmentsFor(scene, marks) };
  fs.writeFileSync(path.join(RAW, `scene-${scene.id}.meta.json`), JSON.stringify(meta, null, 2));
  console.log(`  ✓ ${path.basename(file)} marks=${JSON.stringify(marks)}`);
}

async function main() {
  // Server reachable?
  try {
    const res = await fetch(SB.baseUrl, { redirect: "manual" });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`✗ App not reachable at ${SB.baseUrl} — start it first (e.g. \`npx next start -p 3010\`).`);
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
