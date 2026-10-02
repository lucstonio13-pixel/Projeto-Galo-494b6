"use client";

import { useEffect, useState } from "react";
import { StoreHeader, StoreFooter } from "@/components/store-header";
import { Choice, Confirm, ErrorBox } from "@/components/forms";
import { api, readCart, saveCart, useViewer } from "@/lib/client";
import { cartLineId, configuredUnitPrice, money, selectedOptions, type Product, type CartItem } from "@/lib/catalog";

type Configuration = {
  pickup: boolean;
  delivery: boolean;
  areas: string[];
  fee: number;
  payments: string[];
  address: string;
  eta: string;
  cancellationPolicy: string;
};

export default function Page() {
  const { user, loading } = useViewer();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Configuration | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [orderingMode, setOrderingMode] = useState<"paused" | "test" | "real">("paused");
  const [mode, setMode] = useState("pickup");
  const [payment, setPayment] = useState("");
  const [area, setArea] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCart(readCart());
    api("/api/catalog")
      .then((data) => {
        setProducts(data.products);
        setSettings(data.settings);
        setAccepting(Boolean(data.accepting));
        setOrderingMode(data.orderingMode === "test" ? "test" : data.orderingMode === "real" ? "real" : "paused");
        setMode(data.settings.pickup ? "pickup" : "delivery");
        setPayment(data.settings.payments[0] || "");
        setArea(data.settings.areas[0] || "");
      })
      .catch((caught) => setError(caught.message));
  }, []);

  const fee = mode === "delivery" ? settings?.fee || 0 : 0;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + fee;
  const stale = products.length > 0 && cart.some((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    const currentPrice = product ? configuredUnitPrice(product, item.selections || []) : null;
    return !product?.available || currentPrice === null || currentPrice !== item.price;
  });
  const modes = [
    ...(settings?.pickup ? [{ value: "pickup", label: "Retirar no estabelecimento" }] : []),
    ...(settings?.delivery ? [{ value: "delivery", label: "Receber em casa" }] : []),
  ];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) {
      setError("Confirme que revisou os itens, os dados e o valor total.");
      return;
    }
    if (!accepting) {
      setError("Os pedidos online ainda não estão disponíveis. Seu carrinho permanece salvo neste aparelho.");
      return;
    }
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    let key = sessionStorage.getItem("galeteria-order-key");
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem("galeteria-order-key", key);
    }
    try {
      const order = await api("/api/orders", { ...fields, key, mode, payment, area, fee, items: cart });
      saveCart([]);
      sessionStorage.removeItem("galeteria-order-key");
      location.href = `/pedidos/${order.id}`;
    } catch (caught) {
      try {
        const recovered = await api(`/api/orders?requestKey=${encodeURIComponent(key)}`);
        saveCart([]);
        sessionStorage.removeItem("galeteria-order-key");
        location.href = `/pedidos/${recovered.id}`;
        return;
      } catch {
        setError((caught as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="content-page">
        <a className="back-link" href="/">← Voltar ao cardápio</a>
        <span className="eyebrow">FALTA POUCO</span>
        <h1>Vamos preparar seu pedido?</h1>
        <ol className="order-flow" aria-label="Etapas do pedido">
          <li className="done"><span>1</span><strong>Carrinho</strong></li>
          <li className={user ? "done" : "active"}><span>2</span><strong>Identificação</strong></li>
          <li className={user ? "active" : ""}><span>3</span><strong>Confirmar</strong></li>
          <li><span>4</span><strong>Cozinha</strong></li>
        </ol>
        {loading ? <p>Carregando…</p> : !user ? (
          <div className="panel">
            <p>Entre na sua conta para finalizar. Seu carrinho está guardado.</p>
            <a className="primary" href="/entrar?voltar=/finalizar">Entrar e continuar</a>
          </div>
        ) : !cart.length ? (
          <div className="panel">Seu carrinho está vazio. <a href="/">Ver cardápio</a></div>
        ) : (
          <form className="checkout-grid" onSubmit={submit}>
            <section className="panel form-stack">
              <h2>Seus dados</h2>
              <p>{user.name} · {user.email}</p>
              <label className="field">Telefone para contato
                <input name="phone" type="tel" required minLength={10} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" />
              </label>
              <Choice label="Como você quer receber?" value={mode} onChange={setMode} options={modes} />
              {mode === "delivery" ? <>
                <Choice label="Região atendida" value={area} onChange={setArea} options={settings?.areas || []} />
                <label className="field">Endereço completo
                  <input name="address" required minLength={8} maxLength={400} placeholder="Rua, número e complemento" autoComplete="street-address" />
                </label>
              </> : <div className="notice">Retirada: {settings?.address}</div>}
              <Choice label="Forma de pagamento na entrega ou retirada" value={payment} onChange={setPayment} options={settings?.payments || []} />
              <label className="field">Observação geral
                <textarea name="note" maxLength={300} rows={3} placeholder="Algo que a equipe precisa saber?" />
              </label>
            </section>
            <aside className="panel form-stack">
              <h2>Resumo do pedido</h2>
              {cart.map((item) => {
                const product = products.find((candidate) => candidate.id === item.id);
                const options = product ? selectedOptions(product, item.selections || []) : [];
                return <div className="summary-row" key={item.lineId || cartLineId(item.id, item.selections)}>
                  <span>{item.quantity}× {product?.name || item.id}{options.length > 0 && <small>{options.map((option) => option.name).join(" · ")}</small>}{item.note && <small>{item.note}</small>}</span>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>;
              })}
              <div className="summary-row"><span>Taxa de entrega</span><span>{money(fee)}</span></div>
              <div className="summary-row total"><strong>Total</strong><strong>{money(total)}</strong></div>
              <div className="notice">Pagamento realizado fora do site, na entrega ou retirada. Prazo: {settings?.eta}</div>
              {orderingMode === "test" && <div className="test-order-notice" role="status"><strong>Pedido de teste da equipe</strong><span>Ao confirmar, ele entrará na fila da cozinha identificado como teste e não representará uma venda real.</span></div>}
              {!accepting && <div className="checkout-availability" role="status"><strong>Pedidos online indisponíveis agora</strong><span>O cardápio continua disponível e seu carrinho ficará salvo neste aparelho.</span></div>}
              <p className="small-note">{settings?.cancellationPolicy}</p>
              {stale && <div className="error-box" role="alert">O cardápio mudou depois que você montou o carrinho. <a href="/">Volte ao cardápio para revisar os itens e valores.</a></div>}
              {accepting && <Confirm checked={confirmed} onChange={setConfirmed}>Conferi os itens, os dados e o valor total.</Confirm>}
              <ErrorBox message={error} />
              {accepting ? <>
                <button type="submit" className="primary full" disabled={busy || stale || !confirmed || !settings || modes.length === 0 || !payment}>
                  {busy ? "Enviando pedido…" : orderingMode === "test" ? "Enviar teste para a cozinha" : "Confirmar e enviar à cozinha"}
                </button>
                <small className="muted">Se a conexão falhar, tente novamente: a mesma tentativa não gera um segundo pedido.</small>
              </> : <div className="checkout-paused-actions">
                <a className="secondary full" href="/">Voltar ao cardápio</a>
                <a className="text-button" href="/pedidos">Acompanhar meus pedidos</a>
              </div>}
            </aside>
          </form>
        )}
        <ErrorBox message={!user ? error : ""} />
      </main>
      <StoreFooter />
    </>
  );
}
