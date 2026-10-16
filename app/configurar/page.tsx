"use client";

import { useState } from "react";
import { api, useViewer } from "@/lib/client";
import { StoreHeader } from "@/components/store-header";
import { Confirm, ErrorBox } from "@/components/forms";
import { BUSINESS } from "@/lib/business";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Page() {
  const { user, loading, error: loadError } = useViewer();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<number[]>([...BUSINESS.operatingDays]);
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const areas = String(data.get("areas") || "").split("\n").map((value) => value.trim()).filter(Boolean);
    const payments = String(data.get("payments") || "").split("\n").map((value) => value.trim()).filter(Boolean);
    const fee = Math.round(Number(data.get("fee") || 0) * 100);
    try {
      await api("/api/setup", {
        key: data.get("key"),
        settings: {
          demo: false,
          open: false,
          pickup,
          delivery,
          fee,
          areas,
          areaFees: Object.fromEntries(areas.map((area) => [area, fee])),
          payments,
          storeName: data.get("storeName"),
          address: data.get("address"),
          contact: data.get("contact"),
          timezone: "America/Fortaleza",
          start: data.get("start"),
          end: data.get("end"),
          days,
          eta: data.get("eta"),
          cancellationPolicy: data.get("cancellationPolicy"),
        },
      });
      location.href = "/operacao/configuracoes";
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
        <span className="eyebrow">PRIMEIRO ACESSO</span>
        <h1>Configure a operação real</h1>
        <p className="muted">
          Este passo cria o primeiro administrador e registra as regras comerciais da loja. Nenhum produto fictício será criado e os pedidos começarão pausados.
        </p>
        {loading ? (
          <p>Carregando…</p>
        ) : !user ? (
          <div className="panel">
            <p>Crie sua conta ou entre antes de configurar a loja.</p>
            <div className="actions setup-actions">
              <a className="primary" href="/cadastro?voltar=/configurar">Criar conta de administrador</a>
              <a className="secondary" href="/entrar?voltar=/configurar">Entrar</a>
            </div>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <div className="notice">Conta administradora: <strong>{user.email}</strong></div>
            <label className="field">Chave privada de configuração
              <input type="password" name="key" required minLength={32} autoComplete="off" />
            </label>
            <label className="field">Nome público da loja
              <input name="storeName" defaultValue={BUSINESS.tradeName} required minLength={2} maxLength={100} />
            </label>
            <label className="field">WhatsApp ou telefone de atendimento
              <input name="contact" defaultValue={BUSINESS.contact} required minLength={8} maxLength={100} />
            </label>
            <Confirm checked={pickup} onChange={setPickup}>Permitir retirada no estabelecimento</Confirm>
            {pickup && <label className="field">Endereço completo para retirada
              <input name="address" required minLength={8} maxLength={300} />
            </label>}
            <Confirm checked={delivery} onChange={setDelivery}>Permitir entrega</Confirm>
            {delivery && <>
              <label className="field">Regiões atendidas, uma por linha
                <textarea name="areas" rows={4} placeholder="Adicione os bairros depois na tela Entregas" />
              </label>
              <label className="field">Taxa fixa de entrega (R$)
                <input name="fee" type="number" min="0" step="0.01" defaultValue="0" required />
              </label>
            </>}
            <label className="field">Formas de pagamento, uma por linha
              <textarea name="payments" required rows={4} defaultValue={BUSINESS.paymentMethods.join("\n")} />
            </label>
            <div className="form-row">
              <label className="field">Abre às<input name="start" type="time" defaultValue={BUSINESS.openingTime} required /></label>
              <label className="field">Fecha às<input name="end" type="time" defaultValue={BUSINESS.closingTime} required /></label>
            </div>
            <div>
              <span className="field-label">Dias de funcionamento</span>
              <div className="day-choices">
                {dayNames.map((day, index) => (
                  <Confirm
                    key={day}
                    checked={days.includes(index)}
                    onChange={(value) => setDays(value ? [...days, index] : days.filter((number) => number !== index))}
                  >{day}</Confirm>
                ))}
              </div>
            </div>
            <label className="field">Prazo informado ao cliente
              <input name="eta" required maxLength={100} placeholder="Ex.: retirada em 35–50 minutos" />
            </label>
            <label className="field">Política de cancelamento
              <textarea name="cancellationPolicy" required minLength={10} maxLength={1000} rows={4} />
            </label>
            <Confirm checked={confirmed} onChange={setConfirmed}>
              Confirmei que os dados preenchidos nesta etapa são reais. Endereço, bairros, taxas e cancelamento ainda precisam ser concluídos antes da abertura.
            </Confirm>
            <p className="small-note">Fuso horário: America/Fortaleza. Os pedidos só serão liberados depois que o administrador ativar “Receber pedidos”.</p>
            <ErrorBox message={error || loadError} />
            <button type="submit" className="primary" disabled={busy || !confirmed || days.length === 0 || (!pickup && !delivery)}>
              {busy ? "Configurando…" : "Criar administrador e salvar regras reais"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
