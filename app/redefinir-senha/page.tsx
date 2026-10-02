"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/forms";
import { StoreHeader } from "@/components/store-header";

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmation") || "");
    const token = new URLSearchParams(location.search).get("token");
    if (!token) {
      setError("Este link de recuperação é inválido ou está incompleto.");
      setBusy(false);
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      setBusy(false);
      return;
    }
    try {
      await api("/api/auth/reset-password", { token, newPassword: password });
      setDone(true);
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
        <h1>Crie uma nova senha</h1>
        {done ? (
          <div className="panel form-stack">
            <h2>Senha atualizada</h2>
            <p>As sessões anteriores foram encerradas. Entre novamente com a nova senha.</p>
            <a className="primary" href="/entrar">Entrar</a>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="field">Nova senha
              <input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
            </label>
            <label className="field">Confirme a nova senha
              <input name="confirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
            </label>
            <ErrorBox message={error} />
            <button type="submit" className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar nova senha"}</button>
          </form>
        )}
      </main>
    </>
  );
}
