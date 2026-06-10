import { GateForm } from "./gate-form";

/**
 * v6 — tela do gate de demonstração: fundo 100% preto, wordmark discreto e um
 * único campo de senha. Texto fixo em PT de propósito (roda antes do app e do
 * next-intl). Servida por rewrite do proxy para QUALQUER rota sem cookie.
 */
export default function GatePage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
    >
      <div style={{ width: "min(320px, 86vw)", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: 10,
          }}
        >
          Projeto Vision
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 28 }}>
          Acesso restrito — demonstração interna
        </div>
        <GateForm />
      </div>
    </div>
  );
}
