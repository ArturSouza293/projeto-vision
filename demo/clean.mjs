/**
 * demo/clean.mjs — Demo v4 LIMPA: o vídeo sem legenda, sem texto, sem áudio,
 * na resolução máxima gravada — para narração AO VIVO pelo apresentador.
 *
 * Mantém EXATAMENTE o ritmo da v3 narrada (a linha do tempo áudio-first é
 * recalculada com as durações do TTS em cache), mas o output é só o produto:
 *   - sem legendas queimadas, sem avatar (Vera), sem cards de texto;
 *   - sem trilha de áudio (o apresentador lê o roteiro);
 *   - cap11 (fechamento) vira um freeze do último frame + fade-out — nada de
 *     card com texto;
 *   - resolução de saída = resolução dos takes gravados (grave em 4K com
 *     `node demo/record.mjs --scale 2 --scene <id>`);
 *   - gera o ROTEIRO em .txt com janelas de tempo por bloco, com o texto
 *     EXATAMENTE igual ao da última versão narrada (campo "texto").
 *
 * Uso: node demo/clean.mjs   (requer takes gravados + TTS em cache)
 */
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(fs.readFileSync(path.join(__dirname, "storyboard.json"), "utf8"));
const N = SB.narration;
const RAW = path.join(__dirname, "raw");
const ND = path.join(__dirname, "narrate");
const TTS = path.join(ND, "tts");
const TMP = path.join(ND, "tmp");
const CHAPS = path.join(ND, "chapters_clean");
const OUT = path.join(__dirname, "out");
const FPS = N.fps;
const LEAD = N.gaps.chapterLeadMs / 1000;
const TAIL = N.gaps.chapterTailMs / 1000;
const MAX_SPEED = 1.35; // nunca em videoDictates (caps 5 e 8)
const CRF = 18; // 4K merece um degrau acima do narrado

for (const d of [TTS, TMP, CHAPS, OUT]) fs.mkdirSync(d, { recursive: true });

/* ---------------------------------------------------------------- helpers */
function ffmpeg(args) {
  execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}
function probeDuration(file) {
  const out = execFileSync(ffprobeStatic.path, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file,
  ], { encoding: "utf8" });
  return parseFloat(out.trim());
}
function probeSize(file) {
  const out = execFileSync(ffprobeStatic.path, [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
    "-of", "csv=p=0", file,
  ], { encoding: "utf8" });
  const [w, h] = out.trim().split(",").map(Number);
  return { w, h };
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

function resolveMark(expr, marks) {
  const m = /^([a-z0-9_]+)([+-][\d.]+)?$/i.exec(expr.trim());
  if (!m || marks[m[1]] === undefined) throw new Error(`mark inválido "${expr}"`);
  return Math.max(0.05, marks[m[1]] + (m[2] ? parseFloat(m[2]) : 0));
}

/* ------------------------------------------------------------------ main */
async function main() {
  console.log("— Demo v4 limpa (sem legenda/texto/áudio) —");

  /* preflight: metas dos takes */
  const metas = {};
  for (const ch of N.chapters) {
    for (const cut of ch.cuts ?? []) {
      if (!metas[cut.scene]) {
        const mf = path.join(RAW, `scene-${cut.scene}.meta.json`);
        if (!fs.existsSync(mf)) throw new Error(`take "${cut.scene}" não gravado — rode: node demo/record.mjs --scale 2 --scene ${cut.scene}`);
        metas[cut.scene] = JSON.parse(fs.readFileSync(mf, "utf8"));
      }
    }
  }

  /* resolução de saída = resolução do take gravado (todas iguais) */
  const sizes = Object.values(metas).map((m) => probeSize(m.file));
  const OUTW = sizes[0].w, OUTH = sizes[0].h;
  if (!sizes.every((s) => s.w === OUTW && s.h === OUTH)) {
    throw new Error(`takes com resoluções diferentes: ${sizes.map((s) => `${s.w}x${s.h}`).join(", ")} — regrave todos com o mesmo --scale.`);
  }
  const resLabel = OUTH >= 2160 ? "4K" : `${OUTH}p`;
  console.log(`• resolução de saída: ${OUTW}×${OUTH} (${resLabel})`);

  /* 1 — durações das frases (TTS em cache; só sintetiza o que faltar) */
  const sentences = [];
  for (const ch of N.chapters) {
    ch.narracao.forEach((entry, idx) => {
      const texto = typeof entry === "string" ? entry : entry.texto;
      const falar = typeof entry === "string" ? entry : (entry.falar ?? entry.texto);
      const gapAfter = ((typeof entry === "object" && entry.gapAfterMs != null) ? entry.gapAfterMs : N.gaps.sentenceMs) / 1000;
      const h = sha1(`${N.voice.name}|${N.voice.rate}|${N.voice.pitch ?? ""}|${falar}`);
      sentences.push({ chapter: ch.id, idx, texto, falar, gapAfter, mp3: path.join(TTS, `${h}.mp3`), wav: path.join(TTS, `${h}.wav`) });
    });
  }
  const missing = sentences.filter((s) => !fs.existsSync(s.mp3));
  if (missing.length) {
    console.log(`• TTS: ${missing.length} frase(s) fora do cache — sintetizando (só para cronometrar)…`);
    const ttsPlan = { voice: N.voice.name, rate: N.voice.rate, pitch: N.voice.pitch ?? "", items: missing.map((s) => ({ text: s.falar, mp3: s.mp3 })) };
    fs.writeFileSync(path.join(TMP, "tts_plan_clean.json"), JSON.stringify(ttsPlan));
    const res = python([path.join(ND, "voice.py"), "tts", path.join(TMP, "tts_plan_clean.json")]);
    if (!res.ok) throw new Error(`edge-tts indisponível: ${res.error}`);
  }
  for (const s of sentences) {
    if (!fs.existsSync(s.wav)) ffmpeg(["-i", s.mp3, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", s.wav]);
    s.dur = probeDuration(s.wav);
  }

  /* 2 — linha do tempo áudio-first (idêntica à v3 narrada) */
  const chapters = [];
  let cursor = 0;
  for (const ch of N.chapters) {
    const sents = sentences.filter((s) => s.chapter === ch.id);
    const audioBlock = sents.reduce((a, s, i) => a + s.dur + (i < sents.length - 1 ? s.gapAfter : 0), 0);
    const minDur = LEAD + audioBlock + TAIL;

    let cuts = [], videoNatural = 0;
    if (ch.card) {
      cuts = null; // vira freeze do capítulo anterior (sem card de texto)
    } else {
      for (const c of ch.cuts) {
        const meta = metas[c.scene];
        if (c.segments) {
          for (const seg of meta.segments) {
            if (seg.speed !== 1) throw new Error(`${ch.id}: segments com speed≠1`);
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
      dur = Math.max(minDur, videoNatural);
    } else if (videoNatural > minDur) {
      speed = Math.min(MAX_SPEED, videoNatural / minDur);
      dur = minDur;
    } else {
      dur = minDur;
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
  if (total > N.maxSeconds) throw new Error(`duração ${total.toFixed(1)}s > teto ${N.maxSeconds}s`);

  /* 3 — clipes por capítulo (vídeo puro, sem overlays) */
  console.log("• montando capítulos…");
  const clipFiles = [];
  let prevClip = null;
  for (const ch of chapters) {
    const out = path.join(CHAPS, `${ch.id}.mp4`);
    if (ch.card) {
      /* fechamento SEM texto: congela o último frame do capítulo anterior */
      if (!prevClip) throw new Error(`${ch.id}: capítulo card sem antecessor`);
      const lastPng = path.join(TMP, `freeze_${ch.id}.png`);
      ffmpeg(["-sseof", "-0.12", "-i", prevClip, "-frames:v", "1", "-update", "1", lastPng]);
      ffmpeg(["-loop", "1", "-t", String(ch.dur + 0.2), "-i", lastPng,
        "-vf", `fps=${FPS},scale=${OUTW}:${OUTH}:flags=lanczos,format=yuv420p,trim=end=${ch.dur.toFixed(3)},setpts=PTS-STARTPTS`,
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(CRF), "-r", String(FPS), out]);
    } else {
      const files = [...new Set(ch.cuts.map((c) => c.file))];
      const inputs = files.flatMap((f) => ["-i", f]);
      const parts = ch.cuts.map((c, i) => {
        const idx = files.indexOf(c.file);
        return `[${idx}:v]trim=start=${c.from.toFixed(3)}:end=${c.to.toFixed(3)},setpts=(PTS-STARTPTS)/${ch.speed}[c${i}]`;
      });
      const join = ch.cuts.length > 1
        ? `${parts.join(";")};${ch.cuts.map((_, i) => `[c${i}]`).join("")}concat=n=${ch.cuts.length}:v=1:a=0[vj]`
        : `${parts[0].replace("[c0]", "[vj]")}`;
      const effective = ch.videoNatural / ch.speed;
      const pad = Math.max(0, ch.dur - effective) + 0.25;
      const fc = `${join};[vj]fps=${FPS},scale=${OUTW}:${OUTH}:flags=lanczos,format=yuv420p,` +
        `tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},trim=end=${ch.dur.toFixed(3)},setpts=PTS-STARTPTS[vo]`;
      ffmpeg([...inputs, "-filter_complex", fc, "-map", "[vo]",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(CRF), "-r", String(FPS), out]);
    }
    clipFiles.push(out);
    prevClip = out;
    console.log(`  ✓ ${ch.id} ${ch.dur.toFixed(2)}s${ch.speed > 1 ? ` (×${ch.speed.toFixed(2)})` : ""}${ch.videoDictates ? " [vídeo rege]" : ""}${ch.card ? " [freeze+fade]" : ""}`);
  }

  /* 4 — concat + fades, SEM áudio */
  console.log("• concat + fades (sem trilha de áudio)…");
  const listFile = path.join(TMP, "concat_clean.txt");
  fs.writeFileSync(listFile, clipFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  const joined = path.join(TMP, "joined_clean.mp4");
  ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);

  const outName = `demo_vision_v4_${resLabel}_sem_legenda.mp4`;
  const finalOut = path.join(OUT, outName);
  const vDur = probeDuration(joined);
  ffmpeg(["-i", joined,
    "-vf", `fade=t=in:st=0:d=0.35,fade=t=out:st=${(vDur - 1.2).toFixed(2)}:d=1.2`,
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", String(CRF),
    "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", finalOut]);

  /* 5 — roteiro .txt (texto EXATO da última versão narrada) */
  const roteiroName = "demo_vision_v4_roteiro_narracao.txt";
  const roteiro = [];
  roteiro.push("ROTEIRO DE NARRACAO AO VIVO — Projeto Vision · Demo v4 (video limpo, sem legendas)");
  roteiro.push(`Video: ${outName} · ${OUTW}x${OUTH} · ${total.toFixed(0)}s · ${chapters.length} blocos`);
  roteiro.push("");
  roteiro.push("Como usar: leia cada bloco dentro da janela de tempo indicada. O ritmo foi");
  roteiro.push("calibrado pela narracao original (leitura calma). Nos blocos 5 e 8 o video");
  roteiro.push("espera a interacao em tela — pode respirar sem pressa.");
  roteiro.push("");
  roteiro.push("=".repeat(78));
  for (const [i, ch] of chapters.entries()) {
    const tema = ch.features.map((f) => N.featureNames[f]).join(" + ");
    roteiro.push("");
    roteiro.push(`[${mmss(ch.start)} – ${mmss(ch.start + ch.dur)}]  BLOCO ${i + 1} · ${tema}`);
    roteiro.push(`(em tela: ${ch.card ? "último frame congelado + fade-out (sem card de texto)" : ch.acaoEmTela})`);
    for (const s of ch.sents) roteiro.push(`    ${s.texto}`);
  }
  roteiro.push("");
  roteiro.push("=".repeat(78));
  roteiro.push(`Fim: o video congela e escurece nos ultimos segundos — feche com o Bloco ${chapters.length}.`);
  const roteiroOut = path.join(OUT, roteiroName);
  fs.writeFileSync(roteiroOut, "\uFEFF" + roteiro.join("\r\n"), "utf8"); // BOM p/ Notepad/PowerPoint

  /* 6 — critérios de aceite */
  const dur = probeDuration(finalOut);
  const size = probeSize(finalOut);
  const streams = JSON.parse(probeStreams(finalOut)).streams;
  const hasAudio = streams.some((s) => s.codec_type === "audio");
  const v = streams.find((s) => s.codec_type === "video");
  const checks = [
    [`duração ${dur.toFixed(1)}s ≤ ${N.maxSeconds}s`, dur <= N.maxSeconds],
    [`resolução ${size.w}×${size.h} = takes (${OUTW}×${OUTH})`, size.w === OUTW && size.h === OUTH],
    [`vídeo h264 yuv420p`, v?.codec_name === "h264" && v?.pix_fmt === "yuv420p"],
    [`sem trilha de áudio`, !hasAudio],
    [`caps 5/8 sem aceleração`, chapters.filter((c) => c.videoDictates).every((c) => c.speed === 1)],
    [`roteiro .txt gerado`, fs.existsSync(roteiroOut)],
  ];
  console.log("\n— critérios de aceite —");
  for (const [label, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  const allOk = checks.every(([, ok]) => ok);
  console.log(`\n${allOk ? "✓" : "✗"} ${finalOut} — ${dur.toFixed(1)}s`);
  console.log(`✓ ${roteiroOut}`);
  if (!allOk) process.exit(1);

  /* timestamps p/ conferência */
  console.log("\n— blocos —");
  for (const [i, ch] of chapters.entries()) {
    console.log(`  ${String(i + 1).padStart(2)} [${mmss(ch.start)}–${mmss(ch.start + ch.dur)}] ${ch.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
