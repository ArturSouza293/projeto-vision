# demo/narrate/voice.py - TTS (edge-tts) + montagem sample-accurate da narracao.
#
# Modos:
#   python voice.py tts plan.json
#     plan: {"voice": "...", "rate": "+2%", "items": [{"text": "...", "mp3": "..."}]}
#     Sintetiza os mp3 que faltam (cache por arquivo). Falha ALTO se o servico
#     neural nao responder - nunca degradar para voz robotica silenciosamente.
#
#   python voice.py assemble spec.json
#     spec: {"sampleRate": 48000, "totalSec": N, "out": "...",
#            "sentences": [{"wav": "...", "offsetSec": T}]}
#     Coloca cada frase no offset exato (buffer numpy) -> WAV mono 16-bit.
#     Os respiros de 400ms/700ms sao consequencia dos offsets (deterministico).

import asyncio
import json
import os
import sys
import wave

import numpy as np


def do_tts(plan_path: str) -> None:
    import edge_tts

    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)

    missing = [it for it in plan["items"] if not os.path.exists(it["mp3"])]
    if not missing:
        print(json.dumps({"ok": True, "synthesized": 0}))
        return

    async def synth_one(it: dict) -> None:
        last = None
        for attempt in range(4):  # rede oscila; 4 tentativas com backoff
            try:
                com = edge_tts.Communicate(it["text"], plan["voice"], rate=plan["rate"])
                await com.save(it["mp3"])
                if os.path.exists(it["mp3"]) and os.path.getsize(it["mp3"]) >= 2048:
                    return
                last = RuntimeError(f"TTS vazio para: {it['text'][:60]}")
            except Exception as e:  # noqa: BLE001
                last = e
            if os.path.exists(it["mp3"]):
                os.remove(it["mp3"])
            await asyncio.sleep(1.5 * (attempt + 1))
        raise last

    async def run() -> None:
        for it in missing:
            await synth_one(it)

    try:
        asyncio.run(run())
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(2)
    print(json.dumps({"ok": True, "synthesized": len(missing)}))


def read_wav_mono(path: str, expect_sr: int) -> np.ndarray:
    with wave.open(path, "rb") as w:
        assert w.getsampwidth() == 2, f"{path}: esperado PCM 16-bit"
        assert w.getframerate() == expect_sr, f"{path}: sr {w.getframerate()} != {expect_sr}"
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        if w.getnchannels() == 2:
            data = data.reshape(-1, 2).mean(axis=1).astype(np.int16)
    return data


def do_assemble(spec_path: str) -> None:
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)
    sr = spec["sampleRate"]
    total = int(round(spec["totalSec"] * sr))
    buf = np.zeros(total, dtype=np.int32)
    for s in spec["sentences"]:
        x = read_wav_mono(s["wav"], sr).astype(np.int32)
        i0 = int(round(s["offsetSec"] * sr))
        i1 = min(i0 + len(x), total)
        if i1 > i0:
            buf[i0:i1] += x[: i1 - i0]
    out = np.clip(buf, -32768, 32767).astype(np.int16)
    with wave.open(spec["out"], "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(out.tobytes())
    print(json.dumps({"ok": True, "samples": int(total)}))


if __name__ == "__main__":
    mode, arg = sys.argv[1], sys.argv[2]
    if mode == "tts":
        do_tts(arg)
    elif mode == "assemble":
        do_assemble(arg)
    else:
        raise SystemExit(f"modo desconhecido: {mode}")
