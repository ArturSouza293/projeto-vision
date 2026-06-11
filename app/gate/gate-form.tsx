"use client";

import { useEffect, useRef, useState } from "react";

import { gateToken } from "@/lib/gate-token";

/**
 * Form do gate. A senha é hasheada NO CLIENTE (gateToken = SHA-256) e só o
 * hash trafega — o corpo do request nunca tem a senha em claro nem um campo
 * "password", então filtros de DLP corporativo não o tratam como exfiltração
 * de credencial (era o que travava o acesso no corp).
 *
 * Caminho primário: fetch JSON `{ h }` → recarrega (UX com erro inline).
 * Fallback automático: se o fetch falhar por rede/proxy (não por 401), envia
 * um POST de FORMULÁRIO NATIVO (sem XHR) com o mesmo hash; o servidor responde
 * com redirect 303 e o link continua o mesmo.
 */
export function GateForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hashRef = useRef<HTMLInputElement>(null);

  // Erro vindo do fallback nativo (redirect para /?e=1): mostra e limpa a URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("e") === "1") {
      setError(true);
      params.delete("e");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  function submitNative(hash: string) {
    if (!formRef.current || !hashRef.current) return;
    hashRef.current.value = hash;
    formRef.current.submit(); // navegação nativa: sem fetch, à prova de proxy
  }

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    let hash: string;
    try {
      hash = await gateToken(password);
    } catch {
      setError(true);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ h: hash }),
      });
      if (res.ok) {
        window.location.reload(); // cookie set → o proxy libera a rota original
        return;
      }
      if (res.status === 401) {
        setError(true); // senha realmente errada
        setBusy(false);
        return;
      }
      submitNative(hash); // 5xx/strip no caminho → fallback nativo
    } catch {
      submitNative(hash); // fetch bloqueado pelo proxy corporativo → fallback nativo
    }
  }

  return (
    <div>
      {/* fallback nativo: POST urlencoded só com o hash, sem JS de rede */}
      <form ref={formRef} method="post" action="/api/gate" style={{ display: "none" }}>
        <input ref={hashRef} type="hidden" name="h" />
      </form>

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
