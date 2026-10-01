"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/forms";
import { StoreHeader } from "@/components/store-header";

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const email = String(new FormData(event.currentTarget).get("email") || "");
    try {
      await api("/api/auth/request-password-reset", {
        email,
        redirectTo: `${location.origin}/redefinir-senha`,
      });
      setSent(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="narrow-page">
        <span className="eyebrow">RECUPERAÇÃO DE ACESSO</span>
        <h1>Redefinir senha</h1>
        {sent ? (
          <div className="panel form-stack">
            <h2>Confira seu e-mail</h2>
            <p>Se existir uma conta com esse endereço, enviaremos um link seguro e temporário.</p>
            <a className="primary" href="/entrar">Voltar para o login</a>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <p className="muted">Informe o e-mail da conta. O link enviado poderá ser usado uma única vez.</p>
            <label className="field">E-mail
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            <ErrorBox message={error} />
            <button className="primary" disabled={busy}>{busy ? "Enviando…" : "Enviar link de recuperação"}</button>
          </form>
        )}
      </main>
    </>
  );
}
