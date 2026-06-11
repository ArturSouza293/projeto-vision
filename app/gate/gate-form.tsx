"use client";

import { useState } from "react";

export function GateForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload(); // cookie set → o proxy libera a rota original
        return;
      }
      if (res.status === 401) {
        setError(true); // senha realmente errada
      } else {
        // POST mutilado/bloqueado no caminho (DLP corporativo etc.) →
        // rota alternativa: navegação GET com a chave; o proxy valida,
        // seta o cookie e limpa a URL.
        window.location.assign(`/?k=${encodeURIComponent(password)}`);
        return;
      }
    } catch {
      // fetch nem saiu (proxy corporativo derrubou) → mesma rota alternativa
      window.location.assign(`/?k=${encodeURIComponent(password)}`);
      return;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        aria-label="Senha de acesso"
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${error ? "rgba(204,9,47,0.7)" : "rgba(255,255,255,0.18)"}`,
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 15,
          color: "#fff",
          textAlign: "center",
          letterSpacing: "0.2em",
          outline: "none",
        }}
      />
      <div
        aria-live="polite"
        style={{
          height: 18,
          marginTop: 10,
          fontSize: 11.5,
          color: "rgba(204,9,47,0.85)",
        }}
      >
        {error ? "Senha incorreta" : ""}
      </div>
    </div>
  );
}
