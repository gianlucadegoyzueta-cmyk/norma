"use client";

import { useActionState } from "react";
import { onboardCredentialAction } from "./actions";

type OnboardResult = { ok: boolean; message: string };

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  font: "inherit",
};
const labelStyle: React.CSSProperties = { display: "grid", gap: 4 };

export function CredentialForm() {
  const [state, action, pending] = useActionState<OnboardResult | null, FormData>(
    onboardCredentialAction,
    null,
  );

  return (
    <form action={action} style={{ display: "grid", gap: "0.7rem", maxWidth: 420 }}>
      <label style={labelStyle}>
        <span>Etichetta</span>
        <input name="label" required placeholder="es. Casa Trastevere" style={inputStyle} />
      </label>

      <label style={labelStyle}>
        <span>Tipo credenziale</span>
        <select name="category" defaultValue="SINGOLA" style={inputStyle}>
          <option value="SINGOLA">Struttura singola</option>
          <option value="GESTIONE_APPARTAMENTI">Gestione appartamenti</option>
        </select>
      </label>

      <label style={labelStyle}>
        <span>Provincia (sigla)</span>
        <input name="provincia" required maxLength={2} placeholder="RM" style={{ ...inputStyle, textTransform: "uppercase" }} />
      </label>

      <hr style={{ width: "100%", border: 0, borderTop: "1px solid #eee" }} />
      <p style={{ margin: 0, color: "#666", fontSize: "0.85rem" }}>
        Credenziali Alloggiati Web (salvate cifrate nel vault, mai in chiaro):
      </p>

      <label style={labelStyle}>
        <span>Utente</span>
        <input name="utente" required autoComplete="off" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span>Password</span>
        <input name="password" type="password" required autoComplete="new-password" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span>WSKey</span>
        <input name="wskey" type="password" required autoComplete="off" style={inputStyle} />
      </label>

      <button type="submit" disabled={pending} style={{ padding: "0.6rem 1rem", fontWeight: 600, cursor: pending ? "wait" : "pointer" }}>
        {pending ? "Verifica in corso…" : "Aggiungi e verifica"}
      </button>

      {state && (
        <p role="status" style={{ margin: 0, color: state.ok ? "#137333" : "#c5221f", fontWeight: 500 }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
