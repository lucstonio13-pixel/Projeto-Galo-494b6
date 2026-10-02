'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Confirm, ErrorBox } from '@/components/forms';
import { api } from '@/lib/client';
import { money, statusActionLabels, statusLabels } from '@/lib/catalog';
import { canTransition } from '@/lib/order-rules';

type Row = Record<string, any>;

export default function OperationOrderDetail({ id }: { id: string }) {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api('/api/orders/' + id);
      setData(result);
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const order = data?.order;

  function choose(nextAction: string) {
    setAction(nextAction);
    setReason('');
    setConfirmed(false);
  }

  async function update() {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'received-money') {
        await api('/api/receipts', { key: crypto.randomUUID(), orderId: order.id, amount: order.total, payment: order.payment, confirmed: true });
      } else {
        await api('/api/orders/' + order.id, { revision: order.revision, status: action, reason }, 'PATCH');
      }
      toast.success(action === 'received-money' ? 'Recebimento externo informado.' : 'Pedido atualizado.');
      setAction('');
      await load();
    } catch (cause) {
      setAction('');
      setError((cause as Error).message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return <section className="operation-detail">
    <a className="back-link" href="/operacao/pedidos">← Voltar para a fila</a>
    <ErrorBox message={error} />
    {!order && !error && <p>Carregando pedido…</p>}
    {order && <>
      <div className="operation-detail-heading">
        <div>
          <span className="eyebrow">PEDIDO #{order.id.slice(0, 8).toUpperCase()}</span>
          <h2>{order.name}</h2>
          <p className="muted">{new Date(order.created_at).toLocaleString('pt-BR')} · atualização automática a cada 10 segundos</p>
        </div>
        <span className={'status ' + order.status}>{statusLabels[order.status]}</span>
      </div>
      <div className="checkout-grid">
        <article className="panel form-stack">
          <h2>Itens e atendimento</h2>
          <ul className="order-items operation-detail-items">
            {JSON.parse(order.items).map((item: Row, index: number) => <li key={item.id + '-' + index}>
              <strong>{item.quantity}× {item.name}</strong>
              {item.options?.length > 0 && <small>{item.options.map((option: Row) => `${option.name}${option.price ? ` (+${money(option.price)})` : ''}`).join(' · ')}</small>}
              {item.note && <small>Observação: {item.note}</small>}
              <span>{money(item.price * item.quantity)}</span>
            </li>)}
          </ul>
          {order.note && <div className="notice">Observação geral: {order.note}</div>}
          <div className="summary-row"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
          <div className="summary-row"><span>Taxa de entrega</span><strong>{money(order.fee)}</strong></div>
          <div className="summary-row total"><strong>Total</strong><strong>{money(order.total)}</strong></div>
          <div className="operation-contact">
            <strong>{order.mode === 'pickup' ? 'Retirada' : 'Entrega'}</strong>
            <p>{order.mode === 'pickup' ? order.address : `${order.address}${order.area ? ' · ' + order.area : ''}`}</p>
            <p className="muted">{order.phone}{order.email ? ' · ' + order.email : ''}</p>
            <p className="muted">{order.payment} · {order.paid ? 'Recebimento externo informado' : 'Recebimento não informado'}</p>
          </div>
          <div className="actions">
            {Object.keys(statusLabels).filter((status) => canTransition(order.status, status, order.mode)).map((status) => <button
              className={status === 'cancelled' ? 'secondary danger' : 'primary'}
              key={status}
              onClick={() => choose(status)}
            >{statusActionLabels[status]}</button>)}
            {!order.receipt_id && order.status !== 'cancelled' && <button className="secondary" onClick={() => choose('received-money')}>{order.paid ? 'Conferir recebimento antigo' : 'Informar recebimento'}</button>}
          </div>
        </article>
        <aside className="panel form-stack">
          <h2>Histórico</h2>
          <ol className="timeline">
            {data.history.map((entry: Row, index: number) => <li key={index}>
              <strong>{statusLabels[entry.status]}</strong>
              <time>{new Date(entry.created_at).toLocaleString('pt-BR')}</time>
              <p>Responsável: {entry.actor_name}</p>
              {entry.reason && <p>{entry.reason}</p>}
            </li>)}
          </ol>
        </aside>
      </div>
    </>}

    <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) setAction(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === 'received-money' ? 'Informar recebimento externo' : statusActionLabels[action]}</DialogTitle>
          <DialogDescription>{action === 'received-money' ? 'Confirme somente se o valor foi recebido fora do site. Isso não cria uma entrada financeira.' : action === 'cancelled' ? 'O cancelamento exige motivo e não executa reembolso.' : 'O cliente verá esta atualização no acompanhamento.'}</DialogDescription>
        </DialogHeader>
        {action === 'cancelled' && <label className="field">Motivo
          <textarea required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>}
        <Confirm checked={confirmed} onChange={setConfirmed}>Confirmo {action === 'received-money' ? `o recebimento de ${money(order?.total || 0)}` : `a alteração para ${statusLabels[action]}`}.</Confirm>
        <button className="primary" disabled={busy || !confirmed || (action === 'cancelled' && reason.trim().length < 3)} onClick={update}>{busy ? 'Salvando…' : 'Confirmar'}</button>
      </DialogContent>
    </Dialog>
  </section>;
}
