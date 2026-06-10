/**
 * demo/narrate.mjs — Demo v3 NARRADO: a narração rege o corte.
 *
 * Pipeline (tudo determinístico, regido por storyboard.json → "narration"):
 *   1. TTS por FRASE (edge-tts, voz neural; cache por hash do texto) → wav 48k.
 *   2. Linha do tempo áudio-first: capítulo = lead 300ms + frases (gaps 400ms)
 *      + tail 400ms (tail+lead = respiro de 700ms entre capítulos). Vídeo se
 *      ajusta à fala: freeze (tpad clone) quando falta, corte/aceleração leve
 *      (≤1,35×) quando sobra — EXCETO capítulos videoDictates (timeline e
 *      Plano Ideal): NUNCA acelerar; a fala espera a interação.
 *   3. Montagem da voz sample-accurate (voice.py) → loudnorm 2 passadas
 *      (alvo −16 LUFS) → trilha final AAC 192k.
 *   4. Lip-sync (lipsync.py): envelope RMS 40ms + histerese + piscadas/tilt
 *      com seed fixa → frames da Vera (340×340, lower-third) → overlay por
 *      capítulo (posição configurável: br/bl/tr).
 *   5. Legendas queimadas = a própria frase narrada (pill PNG via Playwright,
 *      janela por frase). O vídeo comunica 100% sem som.
 *   6. docs/DEMO_COVERAGE.md gerado com timestamps reais (F01–F14, 14/14).
 *   7. Critérios de aceite verificados ao final (duração, loudness, lip-sync,
 *      streams H.264+AAC yuv420p, cobertura) — falha alto se algo regredir.
 *
 * Uso: node demo/narrate.mjs   (requer takes gravados: node demo/record.mjs)
 */
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(fs.readFileSync(path.join(__dirname, "storyboard.json"), "utf8"));
const N = SB.narration;
const RAW = path.join(__dirname, "raw");
const ND = path.join(__dirname, "narrate");
const TTS = path.join(ND, "tts");
const TMP = path.join(ND, "tmp");
const FRAMES = path.join(ND, "frames");
const CHAPS = path.join(ND, "chapters");
const OUT = path.join(__dirname, "out");
const LAYERS = path.join(ND, "avatar");
const W = SB.viewport.width, H = SB.viewport.height;
const FPS = N.fps;
const LEAD = N.gaps.chapterLeadMs / 1000;
const TAIL = N.gaps.chapterTailMs / 1000;
const SGAP = N.gaps.sentenceMs / 1000;
const MAX_SPEED = 1.35; // aceleração leve p/ ajustar à fala (nunca em videoDictates)

for (const d of [TTS, TMP, FRAMES, CHAPS, OUT]) fs.mkdirSync(d, { recursive: true });

/* ---------------------------------------------------------------- helpers */
function ffmpeg(args) {
  execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}
function ffmpegStderr(args) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-y", ...args], { encoding: "utf8" });
  return r.stderr ?? "";
}
function probeDuration(file) {
  const out = execFileSync(ffprobeStatic.path, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ], { encoding: "utf8" });
  return parseFloat(out.trim());
}
function probeStreams(file) {
  return execFileSync(ffprobeStatic.path, [
    "-v", "error", "-show_entries", "stream=codec_name,pix_fmt,codec_type", "-of", "json", file,
  ], { encoding: "utf8" });
}
function python(args) {
  const r = spawnSync("python", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`python ${args[0]} falhou:\n${r.stderr}\n${r.stdout}`);
  const lines = r.stdout.trim().split("\n");
  return JSON.parse(lines[lines.length - 1]);
}
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Resolve "mark±offset" contra os marks do meta.json do take. */
function resolveMark(expr, marks) {
  const m = /^([a-z0-9_]+)([+-][\d.]+)?$/i.exec(expr.trim());
  if (!m || marks[m[1]] === undefined) throw new Error(`mark inválido "${expr}"`);
  return Math.max(0.05, marks[m[1]] + (m[2] ? parseFloat(m[2]) : 0));
}

/* ------------------------------------------------------------------ main */
async function main() {
  console.log("— Demo v3 narrado —");

  /* preflight */
  for (const f of ["card_bg.png", "base.png", "mouth_wide.png", "mask.png"]) {
    if (!fs.existsSync(path.join(LAYERS, f))) {
      console.log("• camadas do avatar ausentes — gerando…");
      execFileSync("node", [path.join(ND, "avatar_layers.mjs")], { stdio: "inherit" });
      break;
    }
  }
  const metas = {};
  for (const ch of N.chapters) {
    for (const cut of ch.cuts ?? []) {
      if (!metas[cut.scene]) {
        const mf = path.join(RAW, `scene-${cut.scene}.meta.json`);
        if (!fs.existsSync(mf)) throw new Error(`take "${cut.scene}" não gravado — rode: node demo/record.mjs`);
        metas[cut.scene] = JSON.parse(fs.readFileSync(mf, "utf8"));
      }
    }
  }

  /* 1 — TTS por frase (cache por hash) + durações.
   * Cada item da narração pode ser string OU objeto:
   *   { texto, falar?, gapAfterMs? }
   * "texto" = legenda queimada (sempre o texto oficial);
   * "falar" = o que vai ao TTS — respelling fonético de palavras que fazem a
   *   voz Multilingual trocar de idioma ("Vision"→"Víjon", "BIA"→"Bia") e
   *   pontuação de prosódia (… = pausa real onde a voz atropela a vírgula);
   * "gapAfterMs" = respiro após a frase (default gaps.sentenceMs). */
  console.log("• TTS (edge-tts, " + N.voice.name + ")…");
  const sentences = []; // {chapter, idx, texto, falar, gapAfter, mp3, wav, dur}
  for (const ch of N.chapters) {
    ch.narracao.forEach((entry, idx) => {
      const texto = typeof entry === "string" ? entry : entry.texto;
      const falar = typeof entry === "string" ? entry : (entry.falar ?? entry.texto);
      const gapAfter = ((typeof entry === "object" && entry.gapAfterMs != null) ? entry.gapAfterMs : N.gaps.sentenceMs) / 1000;
      const h = sha1(`${N.voice.name}|${N.voice.rate}|${N.voice.pitch ?? ""}|${falar}`);
      sentences.push({ chapter: ch.id, idx, texto, falar, gapAfter, mp3: path.join(TTS, `${h}.mp3`), wav: path.join(TTS, `${h}.wav`) });
    });
  }
  const runTts = () => {
    const ttsPlan = { voice: N.voice.name, rate: N.voice.rate, pitch: N.voice.pitch ?? "", items: sentences.map((s) => ({ text: s.falar, mp3: s.mp3 })) };
    fs.writeFileSync(path.join(TMP, "tts_plan.json"), JSON.stringify(ttsPlan));
    const res = python([path.join(ND, "voice.py"), "tts", path.join(TMP, "tts_plan.json")]);
    if (!res.ok) throw new Error(`edge-tts indisponível: ${res.error} — PARANDO (sem fallback robótico).`);
  };
  runTts();
  for (const s of sentences) {
    if (!fs.existsSync(s.wav)) {
      try {
        ffmpeg(["-i", s.mp3, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", s.wav]);
      } catch {
        // mp3 truncado pela rede — re-sintetiza só os que faltam e tenta 1×
        fs.rmSync(s.mp3, { force: true });
        fs.rmSync(s.wav, { force: true });
        runTts();
        ffmpeg(["-i", s.mp3, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", s.wav]);
      }
    }
    s.dur = probeDuration(s.wav);
  }

  /* 2 — linha do tempo áudio-first */
  const chapters = [];
  let cursor = 0;
  for (const ch of N.chapters) {
    const sents = sentences.filter((s) => s.chapter === ch.id);
    const audioBlock = sents.reduce((a, s, i) => a + s.dur + (i < sents.length - 1 ? s.gapAfter : 0), 0);
    const minDur = LEAD + audioBlock + TAIL;

    let cuts = [], videoNatural = 0;
    if (ch.card) {
      cuts = null;
    } else {
      for (const c of ch.cuts) {
        const meta = metas[c.scene];
        if (c.segments) {
          for (const seg of meta.segments) {
            if (seg.speed !== 1) throw new Error(`${ch.id}: segments com speed≠1 (proibido acelerar)`);
            cuts.push({ file: meta.file, from: seg.from, to: seg.to });
          }
        } else {
          cuts.push({ file: meta.file, from: resolveMark(c.from, meta.marks), to: resolveMark(c.to, meta.marks) });
        }
      }
      videoNatural = cuts.reduce((a, c) => a + (c.to - c.from), 0);
    }

    let speed = 1, dur;
    if (ch.card) {
      dur = minDur;
    } else if (ch.videoDictates) {
      dur = Math.max(minDur, videoNatural); // a fala espera a interação
    } else if (videoNatural > minDur) {
      speed = Math.min(MAX_SPEED, videoNatural / minDur);
      dur = minDur; // o excedente além de speed é cortado do fim
    } else {
      dur = minDur; // freeze (tpad clone) cobre o que falta
    }

    const sentTimes = [];
    let t = cursor + LEAD;
    for (const s of sents) {
      sentTimes.push({ ...s, start: t, end: t + s.dur });
      t += s.dur + s.gapAfter;
    }
    chapters.push({ ...ch, cuts, videoNatural, speed, dur, start: cursor, sents: sentTimes });
    cursor += dur;
  }
  const total = cursor;
  console.log(`• timeline: ${total.toFixed(1)}s (alvo ~${N.targetSeconds}s, teto ${N.maxSeconds}s)`);
  if (total > N.maxSeconds) throw new Error(`duração ${total.toFixed(1)}s > teto ${N.maxSeconds}s — encurte narração/cortes.`);

  /* 3 — voz: montagem sample-accurate + loudnorm 2 passadas */
  console.log("• montando narração + loudnorm −16 LUFS…");
  const rawWav = path.join(TMP, "voice_raw.wav");
  const normWav = path.join(TMP, "voice_norm.wav");
  fs.writeFileSync(path.join(TMP, "assemble.json"), JSON.stringify({
    sampleRate: 48000, totalSec: total, out: rawWav,
    sentences: chapters.flatMap((c) => c.sents.map((s) => ({ wav: s.wav, offsetSec: s.start }))),
  }));
  python([path.join(ND, "voice.py"), "assemble", path.join(TMP, "assemble.json")]);

  const ln = `I=${N.loudness.i}:TP=${N.loudness.tp}:LRA=${N.loudness.lra}`;
  const p1 = ffmpegStderr(["-i", rawWav, "-af", `loudnorm=${ln}:print_format=json`, "-f", "null", "NUL"]);
  const m1 = JSON.parse(p1.slice(p1.lastIndexOf("{")));
  ffmpeg(["-i", rawWav, "-af",
    `loudnorm=${ln}:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`,
    "-ar", "48000", normWav]);
  const p2 = ffmpegStderr(["-i", normWav, "-af", `loudnorm=${ln}:print_format=json`, "-f", "null", "NUL"]);
  const m2 = JSON.parse(p2.slice(p2.lastIndexOf("{")));
  console.log(`  loudness integrado: ${m2.input_i} LUFS (alvo ${N.loudness.i} ±1)`);

  /* 4 — lip-sync + frames da Vera */
  console.log("• lip-sync + frames da Vera (seed " + N.avatar.seed + ")…");
  const nFrames = Math.ceil(total * FPS) + 3;
  const statesFile = path.join(TMP, "states.json");
  fs.writeFileSync(path.join(TMP, "lipsync_job.json"), JSON.stringify({
    audio: normWav, fps: FPS, frames: nFrames, layersDir: LAYERS, outDir: FRAMES,
    statesOut: statesFile, seed: N.avatar.seed,
    sentences: chapters.flatMap((c) => c.sents.map((s) => ({ start: s.start, end: s.end }))),
  }));
  const lip = python([path.join(ND, "lipsync.py"), path.join(TMP, "lipsync_job.json")]);
  console.log(`  ${lip.frames} frames, lip-sync ${lip.lipsyncAllPass ? "OK" : "FALHOU"} (${lip.cacheVariants} variantes)`);

  /* 5 — legendas (pill PNG por frase, estilo do corte mudo) */
  console.log("• legendas queimadas (1 pill por frase)…");
  const capHtml = (text) => `<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${W}px;height:130px;display:flex;align-items:center;justify-content:center;">
      <div style="max-width:1180px;background:rgba(15,15,20,0.78);border-radius:999px;padding:13px 30px;
                  font-family:'Segoe UI',Arial,sans-serif;font-size:27px;font-weight:600;color:#fff;text-align:center;">
        ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}
      </div></div></body></html>`;
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: W, height: 130 } });
  const capFiles = {};
  for (const s of sentences) {
    const f = path.join(TMP, `cap_${sha1(s.texto)}.png`);
    if (!fs.existsSync(f)) {
      await pg.setContent(capHtml(s.texto));
      await pg.screenshot({ path: f, omitBackground: true, clip: { x: 0, y: 0, width: W, height: 130 } });
    }
    capFiles[s.texto] = f;
  }
  /* card do cap11 (fechamento com logo) */
  const cardFile = path.join(TMP, "card_cap11.png");
  const card = N.chapters.find((c) => c.card)?.card;
  if (card) {
    await pg.setViewportSize({ width: W, height: H });
    await pg.setContent(`<!doctype html><html><body style="margin:0"><div style="width:${W}px;height:${H}px;
      background:radial-gradient(1200px 700px at 50% 42%, #232730, #0E1015);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;color:#fff;">
      <div style="font-size:92px;font-weight:700;letter-spacing:0.06em;">${card.title}<span style="color:#CC092F">.</span></div>
      <div style="margin-top:18px;font-size:30px;font-weight:400;color:rgba(255,255,255,0.78);">${card.subtitle}</div>
      <div style="margin-top:46px;width:74px;height:5px;border-radius:3px;background:#CC092F;"></div>
    </div></body></html>`);
    await pg.screenshot({ path: cardFile });
  }
  await browser.close();

  /* 6 — clipes por capítulo (vídeo + legendas + Vera) */
  console.log("• montando capítulos…");
  const A = N.avatar;
  const avX = { br: W - A.marginPx - A.cardRightPx, bl: A.marginPx - A.cardLeftPx, tr: W - A.marginPx - A.cardRightPx };
  const avY = { br: H - A.marginPx - A.cardBottomPx, bl: H - A.marginPx - A.cardBottomPx, tr: A.marginPx - A.cardTopPx };
  const clipFiles = [];

  for (const ch of chapters) {
    const out = path.join(CHAPS, `${ch.id}.mp4`);
    clipFiles.push(out);
    const inputs = [];
    const fc = [];

    if (ch.card) {
      inputs.push("-loop", "1", "-t", String(ch.dur + 0.2), "-i", cardFile);
      fc.push(`[0:v]fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p,trim=end=${ch.dur.toFixed(3)},setpts=PTS-STARTPTS[vb]`);
    } else {
      const files = [...new Set(ch.cuts.map((c) => c.file))];
      for (const f of files) inputs.push("-i", f);
      const parts = ch.cuts.map((c, i) => {
        const idx = files.indexOf(c.file);
        return `[${idx}:v]trim=start=${c.from.toFixed(3)}:end=${c.to.toFixed(3)},setpts=(PTS-STARTPTS)/${ch.speed}[c${i}]`;
      });
      const join = ch.cuts.length > 1
        ? `${parts.join(";")};${ch.cuts.map((_, i) => `[c${i}]`).join("")}concat=n=${ch.cuts.length}:v=1:a=0[vj]`
        : `${parts[0].replace("[c0]", "[vj]")}`;
      const effective = ch.videoNatural / ch.speed;
      const pad = Math.max(0, ch.dur - effective) + 0.25;
      fc.push(`${join};[vj]fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p,` +
        `tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},trim=end=${ch.dur.toFixed(3)},setpts=PTS-STARTPTS[vb]`);
    }

    /* legendas da fala (tempos relativos ao capítulo) */
    let cur = "vb";
    let inIdx = ch.card ? 1 : [...new Set(ch.cuts.map((c) => c.file))].length;
    for (const s of ch.sents) {
      inputs.push("-i", capFiles[s.texto]);
      const a = (s.start - ch.start - 0.15).toFixed(3);
      const b = (s.end - ch.start + 0.35).toFixed(3);
      fc.push(`[${cur}][${inIdx}:v]overlay=(W-w)/2:${H - 150}:enable='between(t,${a},${b})'[v${inIdx}]`);
      cur = `v${inIdx}`;
      inIdx++;
    }

    /* Vera (frames globais; offset = frame inicial do capítulo). O stream do
     * avatar é RECORTADO no nº de frames do capítulo + shortest=1 — sem isso
     * o overlay estende o clipe até o fim da sequência global de PNGs. */
    const startFrame = Math.round(ch.start * FPS);
    const chFrames = Math.ceil(ch.dur * FPS) + 1;
    inputs.push("-framerate", String(FPS), "-start_number", String(startFrame), "-i", path.join(FRAMES, "f%05d.png"));
    fc.push(`[${inIdx}:v]trim=end_frame=${chFrames},setpts=PTS-STARTPTS[av]`);
    fc.push(`[${cur}][av]overlay=${avX[ch.avatar]}:${avY[ch.avatar]}:eof_action=repeat:shortest=1,format=yuv420p[vo]`);

    ffmpeg([...inputs, "-filter_complex", fc.join(";"), "-map", "[vo]",
      "-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(N.crf), "-r", String(FPS), out]);
    console.log(`  ✓ ${ch.id} ${ch.dur.toFixed(2)}s${ch.speed > 1 ? ` (×${ch.speed.toFixed(2)})` : ""}${ch.videoDictates ? " [vídeo rege]" : ""}`);
  }

  /* 7 — concat + fades + mux da narração */
  console.log("• concat + fades + mux do áudio…");
  const listFile = path.join(TMP, "concat.txt");
  fs.writeFileSync(listFile, clipFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  const joined = path.join(TMP, "joined.mp4");
  ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);

  const finalOut = path.join(OUT, N.output);
  const vDur = probeDuration(joined);
  ffmpeg(["-i", joined, "-i", normWav,
    "-filter_complex", `[0:v]fade=t=in:st=0:d=0.35,fade=t=out:st=${(vDur - 0.5).toFixed(2)}:d=0.5[v]`,
    "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", String(N.crf),
    "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", "-shortest", finalOut]);

  /* 8 — docs/DEMO_COVERAGE.md (gerado, timestamps reais) */
  const allF = Object.keys(N.featureNames);
  const covered = new Set(chapters.flatMap((c) => c.features));
  const missing = allF.filter((f) => !covered.has(f));
  const rows = [];
  for (const f of allF) {
    const ch = chapters.find((c) => c.features.includes(f));
    rows.push(`| ${f} | ${N.featureNames[f]} | ${ch.id} | ${mmss(ch.start)} | ${ch.acaoEmTela} |`);
  }
  const cov = `# DEMO_COVERAGE — vídeo narrado v3 (${N.output})

> Gerado por \`demo/narrate.mjs\` — NÃO editar à mão; regenere com \`npm run demo:narrate\`.
> Duração final: **${probeDuration(finalOut).toFixed(1)}s** (alvo ~${N.targetSeconds}s, teto ${N.maxSeconds}s) · voz ${N.voice.name} ${N.voice.rate} · loudness ${m2.input_i} LUFS.

| Feature | Nome | Capítulo | Timestamp | O que foi mostrado |
|---|---|---|---|---|
${rows.join("\n")}

Cobertura: **${covered.size}/14** features.${missing.length ? ` FALTANDO: ${missing.join(", ")}` : " Nenhuma ausente."}
F14 (Motor) é coberto na narração do fechamento — é fundação, não tela.

## Narração por capítulo
${chapters.map((c) => `- **${c.id}** [${mmss(c.start)}–${mmss(c.start + c.dur)}] (${c.features.join(", ")}): ${c.sents.map((s) => `"${s.texto}"`).join(" ")}`).join("\n")}
`;
  fs.writeFileSync(path.join(__dirname, "..", "docs", "DEMO_COVERAGE.md"), cov);

  /* 9 — critérios de aceite */
  const dur = probeDuration(finalOut);
  const states = JSON.parse(fs.readFileSync(statesFile, "utf8"));
  const streams = probeStreams(finalOut);
  const loudOk = Math.abs(parseFloat(m2.input_i) - N.loudness.i) <= 1;
  const checks = [
    [`duração ${dur.toFixed(1)}s ≤ ${N.maxSeconds}s`, dur <= N.maxSeconds],
    [`cobertura 14/14 features`, missing.length === 0],
    [`loudness ${m2.input_i} LUFS dentro de ±1`, loudOk],
    [`lip-sync: boca fechada no fim de cada frase`, states.allPass],
    [`streams h264+aac yuv420p`, streams.includes("h264") && streams.includes("aac") && streams.includes("yuv420p")],
    [`caps 5/8 sem aceleração`, chapters.filter((c) => c.videoDictates).every((c) => c.speed === 1)],
  ];
  console.log("\n— critérios de aceite —");
  for (const [label, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!states.allPass) {
    for (const t of states.sentenceTests.filter((x) => !x.pass)) {
      console.log(`    frase ${t.idx} closedShare=${t.closedShare}`);
    }
  }
  const allOk = checks.every(([, ok]) => ok);
  console.log(`\n${allOk ? "✓" : "✗"} ${finalOut} — ${dur.toFixed(1)}s`);
  if (!allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
