"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Confirm, ErrorBox } from "@/components/forms";
import DeliveryAreas from "./delivery-areas";

type Settings = Record<string, any> & {
  delivery: boolean;
  areas: string[];
  areaFees: Record<string, number>;
};

export default function DeliverySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/manage");
      setSettings(data.settings);
      setRevision(data.revision);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError("");
    const areas = settings.areas.map((area) => area.trim()).filter(Boolean);
    const areaFees = Object.fromEntries(
      areas.map((area, index) => [area, settings.areaFees[settings.areas[index]] ?? 0]),
    );
    try {
      await api("/api/manage", {
        action: "settings",
        revision,
        settings: { ...settings, areas, areaFees },
      });
      await load();
      toast.success("Cobertura e taxas salvas");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <><p>Carregando entregas…</p><ErrorBox message={error} /></>;

  return <form className="form-stack" onSubmit={save}>
    <section className="panel form-stack">
      <div className="section-heading">
        <div>
          <h2>Entrega por bairro</h2>
          <p className="muted">A taxa escolhida para o bairro é somada ao pedido e validada novamente pelo servidor.</p>
        </div>
      </div>
      <Confirm checked={settings.delivery} onChange={(delivery) => setSettings({ ...settings, delivery })}>
        Oferecer entrega
      </Confirm>
      {settings.delivery ? <DeliveryAreas
        areas={settings.areas}
        areaFees={settings.areaFees || {}}
        onChange={(areas, areaFees) => setSettings({ ...settings, areas, areaFees })}
      /> : <div className="notice">A retirada continua disponível, mas a opção de entrega não será exibida aos clientes.</div>}
      {settings.delivery && !settings.areas.length && <div className="notice">Cadastre ao menos um bairro e sua taxa antes de abrir os pedidos reais.</div>}
      <ErrorBox message={error} />
      <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar bairros e taxas"}</button>
    </section>
  </form>;
}
