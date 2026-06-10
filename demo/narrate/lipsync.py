# demo/narrate/lipsync.py - envelope RMS -> estados de boca -> frames da Vera.
#
#   python lipsync.py job.json
#   job: {"audio": "voice_norm.wav", "fps": 25, "frames": N,
#         "layersDir": "...", "outDir": "...", "statesOut": "...",
#         "seed": 42, "sentences": [{"start": T0, "end": T1}, ...]}
#
# Regras (do spec):
# - janela de 40ms (= 1 frame a 25fps), RMS normalizado (p95), media movel 3;
# - 4 bocas com HISTERESE nos limiares <0.08 / 0.08-0.30 / 0.30-0.62 / >0.62;
# - boca fechada nos silencios; piscadas a cada 3-5s (seed fixa, 120ms);
# - micro-inclinacao de +-1.5 graus no inicio de cada frase (sinal alternado);
# - teste objetivo: nos 300ms finais de cada frase, estado majoritario = fechada.
#
# Render: camadas PNG 680x680 (2x) -> composicao com cache por
# (boca, olhos, angulo quantizado 0.25 graus) -> frames 340x340 RGBA.

import json
import os
import sys
import wave

import numpy as np
from PIL import Image

UP = [0.08, 0.30, 0.62]  # limiares fechada->semi->aberta->larga
HYST = 0.025
MOUTHS = ["mouth_closed.png", "mouth_semi.png", "mouth_open.png", "mouth_wide.png"]
PIVOT = (340, 400)  # px @2x = ponto do pescoco (svg 150,200 em viewBox -20 0 340 340)


def main(job_path: str) -> None:
    with open(job_path, "r", encoding="utf-8") as f:
        job = json.load(f)
    fps, n_frames = job["fps"], job["frames"]

    with wave.open(job["audio"], "rb") as w:
        sr = w.getframerate()
        assert w.getsampwidth() == 2 and w.getnchannels() == 1
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
    win = int(round(sr / fps))  # 40ms a 25fps
    need = n_frames * win
    if len(x) < need:
        x = np.pad(x, (0, need - len(x)))

    rms = np.sqrt(np.mean(x[: need].reshape(n_frames, win) ** 2, axis=1))
    voiced = rms[rms > 0.001]
    p95 = float(np.percentile(voiced, 95)) if len(voiced) else 1.0
    env = np.clip(rms / max(p95, 1e-6), 0.0, 1.0)
    env = np.convolve(env, np.ones(3) / 3.0, mode="same")  # media movel 3 janelas

    # histerese: sobe so acima de UP[s]+HYST, desce so abaixo de UP[s-1]-HYST
    states = np.zeros(n_frames, dtype=np.int8)
    s = 0
    for i, v in enumerate(env):
        while s < 3 and v >= UP[s] + HYST:
            s += 1
        while s > 0 and v <= UP[s - 1] - HYST:
            s -= 1
        states[i] = s

    # piscadas deterministas (seed) + micro-inclinacao por frase
    rng = np.random.default_rng(job["seed"])
    blink = np.zeros(n_frames, dtype=bool)
    t = float(rng.uniform(3.0, 5.0))
    dur_total = n_frames / fps
    while t < dur_total:
        i0 = int(t * fps)
        blink[i0 : i0 + max(1, int(round(0.12 * fps)))] = True
        t += float(rng.uniform(3.0, 5.0))

    angle = np.zeros(n_frames, dtype=np.float64)
    for k, sent in enumerate(job["sentences"]):
        amp = 1.5 if k % 2 == 0 else -1.5
        t0 = sent["start"]
        for i in range(n_frames):
            ti = i / fps - t0
            if 0 <= ti < 0.25:
                a = amp * (ti / 0.25)
            elif 0.25 <= ti < 0.75:
                a = amp
            elif 0.75 <= ti < 1.10:
                a = amp * (1 - (ti - 0.75) / 0.35)
            else:
                continue
            angle[i] = a

    # ---------------------------------------------------------------- render
    ld = job["layersDir"]
    L = lambda n: Image.open(os.path.join(ld, n)).convert("RGBA")  # noqa: E731
    card_bg, lower, mask = L("card_bg.png"), L("lower_third.png"), L("mask.png")
    base_img = L("base.png")
    eyes = {True: L("eyes_open.png"), False: L("eyes_closed.png")}
    mouths = [L(m) for m in MOUTHS]
    mask_a = mask.split()[3]

    from PIL import ImageChops

    cache: dict = {}

    def frame_for(mouth: int, eyes_open: bool, ang_q: float) -> Image.Image:
        key = (mouth, eyes_open, ang_q)
        if key not in cache:
            bust = Image.new("RGBA", card_bg.size, (0, 0, 0, 0))
            bust.alpha_composite(base_img)
            bust.alpha_composite(eyes[eyes_open])
            bust.alpha_composite(mouths[mouth])
            if ang_q:
                bust = bust.rotate(ang_q, resample=Image.BICUBIC, center=PIVOT)
            bust.putalpha(ImageChops.multiply(bust.split()[3], mask_a))
            f = card_bg.copy()
            f.alpha_composite(bust)
            f.alpha_composite(lower)
            cache[key] = f.resize((340, 340), Image.LANCZOS)
        return cache[key]
    os.makedirs(job["outDir"], exist_ok=True)
    for i in range(n_frames):
        ang_q = round(float(angle[i]) / 0.25) * 0.25
        img = frame_for(int(states[i]), not blink[i], ang_q)
        img.save(os.path.join(job["outDir"], f"f{i:05d}.png"))

    # ------------------------------------------------- teste objetivo (spec)
    tests = []
    for k, sent in enumerate(job["sentences"]):
        i1 = min(n_frames, int(round(sent["end"] * fps)))
        i0 = max(0, i1 - int(round(0.3 * fps)))
        seg = states[i0:i1]
        share = float(np.mean(seg == 0)) if len(seg) else 1.0
        tests.append({"idx": k, "start": sent["start"], "end": sent["end"],
                      "closedShare": round(share, 3), "pass": share >= 0.5})

    with open(job["statesOut"], "w", encoding="utf-8") as f:
        json.dump({
            "fps": fps,
            "frames": n_frames,
            "states": states.tolist(),
            "sentenceTests": tests,
            "allPass": all(t["pass"] for t in tests),
        }, f)
    print(json.dumps({"ok": True, "frames": n_frames,
                      "lipsyncAllPass": all(t["pass"] for t in tests),
                      "cacheVariants": len(cache)}))


if __name__ == "__main__":
    main(sys.argv[1])
