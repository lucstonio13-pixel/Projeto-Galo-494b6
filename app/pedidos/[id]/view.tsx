'use client';

import { useEffect, useState } from 'react';
import { StoreHeader, StoreFooter } from '@/components/store-header';
import { api } from '@/lib/client';
import { ErrorBox } from '@/components/forms';
import { money, statusLabels } from '@/lib/catalog';

type Row = Record<string, any>;

export default function OrderDetail({ id }: { id: string }) {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => api('/api/orders/' + id)
      .then((result) => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  const order = data?.order;
  return <>
    <StoreHeader />
    <main className="content-page">
      <a className="back-link" href="/pedidos">← Meus pedidos</a>
      <span className="eyebrow">ACOMPANHE SEU PEDIDO</span>
      <h1>Pedido #{id.slice(0, 8).toUpperCase()}</h1>
      <ErrorBox message={error} />
      {order ? <div className="checkout-grid">
        <section className="panel form-stack">
          <span className={'status ' + order.status}>{statusLabels[order.status]}</span>
          <h2>{order.status === 'received' ? 'Recebemos seu pedido!' : order.status === 'completed' ? 'Obrigado pela preferência!' : order.status === 'cancelled' ? 'Pedido cancelado' : 'Estamos cuidando do seu pedido.'}</h2>
          <p className="muted">O andamento é atualizado automaticamente.</p>
          <ol className="timeline">
            {data?.history.map((entry: Row, index: number) => <li key={index}>
              <strong>{statusLabels[entry.status]}</strong>
              <time>{new Date(entry.created_at).toLocaleString('pt-BR')}</time>
              {entry.actor_name && <p>Atualizado por: {entry.actor_name}</p>}
              {entry.reason && <p>{entry.reason}</p>}
            </li>)}
          </ol>
        </section>
        <aside className="panel form-stack">
          <h2>Resumo</h2>
          {JSON.parse(order.items).map((item: Row, index: number) => <div className="summary-row" key={item.id + '-' + index}>
            <span>{item.quantity}× {item.name}{item.options?.length > 0 && <small>{item.options.map((option: Row) => option.name).join(' · ')}</small>}{item.note && <small>{item.note}</small>}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>)}
          <div className="summary-row"><span>Taxa de entrega</span><span>{money(order.fee)}</span></div>
          <div className="summary-row total"><strong>Total</strong><strong>{money(order.total)}</strong></div>
          <p>{order.mode === 'pickup' ? `Retirada em ${order.address}` : `Entrega em ${order.address}${order.area ? ' · ' + order.area : ''}`}</p>
          <p className="muted">Contato: {order.phone}{order.email ? ' · ' + order.email : ''}</p>
          <p className="muted">{order.payment} · {order.paid ? 'Recebimento informado pela equipe' : 'Pagamento fora do site'}</p>
          {order.note && <p>Observação: {order.note}</p>}
          <p className="small-note">Para solicitar cancelamento, entre em contato com o estabelecimento. A equipe precisa confirmar o cancelamento.</p>
        </aside>
      </div> : !error && <p>Carregando pedido…</p>}
    </main>
    <StoreFooter />
  </>;
}
