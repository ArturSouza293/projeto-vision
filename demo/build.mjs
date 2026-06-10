/**
 * demo/build.mjs — assembles demo/raw/* clips into the final MP4.
 *
 * Per scene: trim to the cut segments computed by record.mjs (timing marks),
 * apply per-scene speed (setpts), normalize to 30fps/1080p/yuv420p, 0.3s
 * fade in/out. Brand cards (PNG → 2s clips) open and close the cut. Everything
 * is concatenated stream-copy. No audio anywhere (-an).
 *
 * Official brand cards: drop card-open.png / card-close.png into demo/assets/
 * and they are used as-is; otherwise simple dark cards are generated.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(fs.readFileSync(path.join(__dirname, "storyboard.json"), "utf8"));
const RAW = path.join(__dirname, "raw");
const OUT = path.join(__dirname, "out");
const SEGS = path.join(OUT, "segments");
const FADE = SB.fadeSeconds;
const { width: W, height: H } = SB.viewport;

fs.mkdirSync(SEGS, { recursive: true });

function ffmpeg(args) {
  execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}
function probeDuration(file) {
  const out = execFileSync(ffprobeStatic.path, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ]);
  return parseFloat(out.toString().trim());
}

/* ----------------------------------------------------------------- cards */
function cardHtml({ title, subtitle }) {
  return `<!doctype html><html><body style="margin:0"><div style="width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(1200px 700px at 50% 42%, #232330 0%, #131318 62%, #0d0d11 100%);font-family:'Nunito Sans','Segoe UI',system-ui,sans-serif;">
    <div style="text-align:center">
      <div style="width:64px;height:5px;border-radius:99px;background:#CE2A47;margin:0 auto 34px"></div>
      <div style="color:#fff;font-size:84px;font-weight:700;letter-spacing:-1.5px;line-height:1.1">${title}</div>
      <div style="color:rgba(255,255,255,0.55);font-size:34px;font-weight:400;margin-top:18px;letter-spacing:0.5px">${subtitle}</div>
    </div>
  </div></body></html>`;
}

/** Executive caption bar: a translucent pill rendered to a transparent PNG and
 *  overlaid near the bottom of the scene — high-level "what you're seeing". */
const CAPTION_H = 120;
function captionHtml(text) {
  return `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${W}px;height:${CAPTION_H}px;display:flex;align-items:center;justify-content:center;font-family:'Nunito Sans','Segoe UI',system-ui,sans-serif;">
    <div style="display:flex;align-items:center;gap:14px;background:rgba(15,15,20,0.78);border-radius:999px;padding:14px 30px;box-shadow:0 4px 18px rgba(0,0,0,0.25)">
      <span style="width:10px;height:10px;border-radius:50%;background:#CE2A47;flex:none"></span>
      <span style="color:#fff;font-size:29px;font-weight:600;letter-spacing:0.2px;white-space:nowrap">${text}</span>
    </div>
  </div></body></html>`;
}

async function ensureOverlays() {
  const wanted = [
    { key: "open", file: "card-open.png" },
    { key: "close", file: "card-close.png" },
  ];
  const cards = {};
  const missingCards = [];
  for (const w of wanted) {
    const official = path.join(__dirname, "assets", w.file);
    if (fs.existsSync(official)) cards[w.key] = official;
    else missingCards.push(w);
  }
  const captionScenes = SB.scenes.filter((s) => s.caption);

  const captions = {};
  if (missingCards.length || captionScenes.length) {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    fs.mkdirSync(path.join(RAW, "cards"), { recursive: true });
    fs.mkdirSync(path.join(RAW, "captions"), { recursive: true });
    for (const w of missingCards) {
      await page.setContent(cardHtml(SB.cards[w.key]));
      const file = path.join(RAW, "cards", w.file);
      await page.screenshot({ path: file });
      cards[w.key] = file;
      console.log(`• generated ${w.file} (drop an official PNG in demo/assets/ to replace)`);
    }
    for (const s of captionScenes) {
      await page.setContent(captionHtml(s.caption));
      const file = path.join(RAW, "captions", `${s.id}.png`);
      await page.screenshot({
        path: file,
        omitBackground: true,
        clip: { x: 0, y: 0, width: W, height: CAPTION_H },
      });
      captions[s.id] = file;
    }
    if (captionScenes.length) console.log(`• generated ${captionScenes.length} caption overlays`);
    await browser.close();
  }
  return { cards, captions };
}

/* -------------------------------------------------------------- segments */
const norm = `fps=${SB.fps},scale=${W}:${H}:flags=lanczos,format=yuv420p`;
const enc = ["-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(SB.crf)];

function buildCardClip(png, seconds, outFile) {
  const fadeOut = Math.max(0, seconds - FADE);
  ffmpeg([
    "-loop", "1", "-t", String(seconds), "-i", png,
    "-vf", `${norm},fade=t=in:st=0:d=${FADE},fade=t=out:st=${fadeOut}:d=${FADE}`,
    ...enc, outFile,
  ]);
  return outFile;
}

function buildSceneClip(meta, outFile, captionPng) {
  const parts = meta.segments.map(
    (s, i) => `[0:v]trim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)},setpts=(PTS-STARTPTS)/${s.speed}[v${i}]`,
  );
  const labels = meta.segments.map((_, i) => `[v${i}]`).join("");
  const joined =
    meta.segments.length > 1
      ? `${parts.join(";")};${labels}concat=n=${meta.segments.length}:v=1:a=0[vj]`
      : `${parts[0].replace("[v0]", "[vj]")}`;
  const dur = meta.segments.reduce((acc, s) => acc + (s.to - s.from) / s.speed, 0);
  const fades = `fade=t=in:st=0:d=${FADE},fade=t=out:st=${Math.max(0, dur - FADE).toFixed(3)}:d=${FADE}`;
  // Caption is overlaid before the fades so it fades in/out with the scene.
  const graph = captionPng
    ? `${joined};[vj]${norm}[vb];[vb][1:v]overlay=(W-w)/2:${H - 156},${fades}[vo]`
    : `${joined};[vj]${norm},${fades}[vo]`;
  const inputs = captionPng ? ["-i", meta.file, "-i", captionPng] : ["-i", meta.file];
  ffmpeg([...inputs, "-filter_complex", graph, "-map", "[vo]", ...enc, outFile]);
  return outFile;
}

/* ------------------------------------------------------------------ main */
async function main() {
  const { cards, captions } = await ensureOverlays();
  const clips = [];

  clips.push(buildCardClip(cards.open, SB.cards.open.seconds, path.join(SEGS, "00-card-open.mp4")));

  SB.scenes.forEach((scene, i) => {
    const metaFile = path.join(RAW, `scene-${scene.id}.meta.json`);
    if (!fs.existsSync(metaFile)) {
      console.error(`✗ missing ${metaFile} — run \`npm run demo:record\` first.`);
      process.exit(1);
    }
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    const out = path.join(SEGS, `${String(i + 1).padStart(2, "0")}-${scene.id}.mp4`);
    clips.push(buildSceneClip(meta, out, captions[scene.id]));
    console.log(`• scene ${scene.id}: ${probeDuration(out).toFixed(2)}s`);
  });

  clips.push(buildCardClip(cards.close, SB.cards.close.seconds, path.join(SEGS, "99-card-close.mp4")));

  const listFile = path.join(SEGS, "concat.txt");
  fs.writeFileSync(listFile, clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
  const finalFile = path.join(OUT, SB.output);
  ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", finalFile]);

  const total = probeDuration(finalFile);
  console.log(`\n✓ ${path.relative(process.cwd(), finalFile)} — ${total.toFixed(2)}s (target ≤ ${SB.targetSeconds}s)`);
  if (total > SB.targetSeconds) {
    console.warn(`⚠ over target by ${(total - SB.targetSeconds).toFixed(2)}s — trim pauses in storyboard.json and re-run.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
