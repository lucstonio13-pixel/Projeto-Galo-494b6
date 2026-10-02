"use client";

import { useEffect, useState } from "react";
import { api, useViewer } from "@/lib/client";
import { ErrorBox } from "@/components/forms";
import { StoreHeader } from "@/components/store-header";

type Invitation = { email: string; expiresAt: string };

export default function Page() {
  const { user, loading } = useViewer();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = typeof window === "undefined" ? "" : new URLSearchParams(location.search).get("token") || "";
  const returnPath = `/convite-equipe?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (!token) {
      setError("O link do convite está incompleto.");
      return;
    }
    api(`/api/team-invites/accept?token=${encodeURIComponent(token)}`)
      .then((data) => setInvitation(data as Invitation))
      .catch((caught) => setError(caught.message));
  }, [token]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await api("/api/team-invites/accept", { token });
      location.href = "/operacao";
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="narrow-page">
        <span className="eyebrow">EQUIPE GALERIA RC</span>
        <h1>Aceitar convite</h1>
        <ErrorBox message={error} />
        {invitation && !loading && !user && (
          <div className="panel form-stack">
            <p>O convite foi enviado para <strong>{invitation.email}</strong>.</p>
            <p className="muted">Entre nessa conta ou crie-a para confirmar o acesso de operador.</p>
            <a className="primary" href={`/entrar?voltar=${encodeURIComponent(returnPath)}`}>Entrar</a>
            <a className="secondary" href={`/cadastro?voltar=${encodeURIComponent(returnPath)}`}>Criar conta</a>
          </div>
        )}
        {invitation && user && (
          <div className="panel form-stack">
            <p>Conta conectada: <strong>{user.email}</strong></p>
            <p className="muted">Ao aceitar, esta conta terá acesso aos pedidos e ao cardápio, mas não ao financeiro nem às configurações.</p>
            {user.email.toLowerCase() !== invitation.email.toLowerCase() && (
              <ErrorBox message={`Este convite pertence a ${invitation.email}. Entre com essa conta para liberar o botão.`} />
            )}
            <button type="button" className="primary" disabled={busy || user.email.toLowerCase() !== invitation.email.toLowerCase()} onClick={accept}>
              {busy ? "Confirmando…" : "Aceitar acesso de operador"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
