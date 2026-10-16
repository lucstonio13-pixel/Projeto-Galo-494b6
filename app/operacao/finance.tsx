'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/client';
import { Choice, Confirm, ErrorBox } from '@/components/forms';
import { financeCategories, money, statusLabels } from '@/lib/catalog';
import { localDay, validDate } from '@/lib/order-rules';
import { orderNumber } from '@/lib/order-number';
import { toast } from 'sonner';
import { BUSINESS } from '@/lib/business';

type Row = Record<string, any>;

export default function Finance() {
  const [from, setFrom] = useState(localDay().slice(0, 7) + '-01');
  const [to, setTo] = useState(localDay());
  const [period, setPeriod] = useState({ from: localDay().slice(0, 7) + '-01', to: localDay() });
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [method, setMethod] = useState('all');
  const [linked, setLinked] = useState('all');
  const [edit, setEdit] = useState<Row | null>(null);
  const [correction, setCorrection] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [receipts, setReceipts] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([...BUSINESS.paymentMethods]);
  const [paymentsBusy, setPaymentsBusy] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');

  const load = useCallback(() => {
    const id = ++requestId.current;
    setError('');
    setLoading(true);
    setData(null);
    return api(`/api/finance?from=${period.from}&to=${period.to}`)
      .then((result) => { if (id === requestId.current) { setData(result); setPaymentMethods(result.paymentMethods?.length ? result.paymentMethods : [...BUSINESS.paymentMethods]); } })
      .catch((cause) => { if (id === requestId.current) setError(cause.message); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [period]);

  useEffect(() => { load(); }, [load]);

  function applyPeriod(start: string, end: string) {
    if (!validDate(start) || !validDate(end) || start > end) {
      setError('Informe um período válido: a data inicial deve ser anterior ou igual à final.');
      return;
    }
    setFrom(start); setTo(end); setPeriod({ from: start, to: end });
  }

  function create(type: 'income' | 'expense') {
    setDialogError('');
    setEdit({
      key: crypto.randomUUID(), type, amount: 0, description: '',
      category: type === 'income' ? 'Vendas' : 'Ingredientes',
      date: localDay(), payment: 'Dinheiro', orderId: 'none', receiptId: 'none',
      refundOf: 'none', reason: '', confirmed: false, refundConfirmed: false,
    });
    if (type === 'income') {
      api('/api/receipts')
        .then((result) => setReceipts(result.receipts.filter((receipt: Row) => !receipt.ledger_id)))
        .catch((cause) => setDialogError(cause.message));
    }
  }

  const rows: Row[] = data?.entries || [];
  const visible = rows.filter((row) =>
    (filter === 'all' || row.type === filter) &&
    (category === 'all' || row.category === category) &&
    (method === 'all' || row.payment === method) &&
    (linked === 'all' || (linked === 'yes' ? Boolean(row.order_id) : !row.order_id)),
  );
  const totals = data?.totals || { previous: 0, income: 0, expense: 0 };
  const serverCategories = (type: 'income' | 'expense') => {
    const values = (data?.categories || []).filter((entry: Row) => entry.type === type).map((entry: Row) => entry.name);
    return values.length ? values : financeCategories[type];
  };
  const paymentOptions = Array.from(new Set([
    ...(data?.paymentMethods?.length ? data.paymentMethods : BUSINESS.paymentMethods),
    'Transferência externa', 'Outro',
    ...receipts.map((receipt) => receipt.payment),
    ...(edit?.payment ? [edit.payment] : []),
  ]));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!edit) return;
    setBusy(true);
    setDialogError('');
    try {
      await api('/api/finance', {
        ...edit,
        orderId: edit.orderId === 'none' ? undefined : edit.orderId,
        receiptId: edit.receiptId === 'none' ? undefined : edit.receiptId,
        refundOf: edit.refundOf === 'none' ? undefined : edit.refundOf,
      });
      setEdit(null);
      await load();
      toast.success('Movimentação registrada');
    } catch (cause) {
      setDialogError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function savePaymentMethods(event: React.FormEvent) {
    event.preventDefault();
    const payments = Array.from(new Set(paymentMethods.map((method) => method.trim()).filter(Boolean)));
    if (!payments.length || payments.some((method) => method.length < 2)) {
      setPaymentsError('Informe pelo menos uma forma de pagamento válida.');
      return;
    }
    setPaymentsBusy(true);
    setPaymentsError('');
    try {
      await api('/api/finance', { payments, revision: data?.settingsRevision }, 'PATCH');
      await load();
      toast.success('Formas de pagamento atualizadas');
    } catch (cause) {
      setPaymentsError((cause as Error).message);
    } finally {
      setPaymentsBusy(false);
    }
  }

  return <>
    <div className="finance-title">
      <p className="muted">Entradas e saídas confirmadas manualmente pelo administrador.</p>
      <div className="actions">
        <button type="button" className="secondary" onClick={() => create('expense')}><ArrowUpRight size={17} />Nova saída</button>
        <button type="button" className="primary" onClick={() => create('income')}><ArrowDownLeft size={17} />Nova entrada</button>
      </div>
    </div>
    <section className="panel form-stack">
      <div className="section-heading"><div><h2>Formas de pagamento</h2><p className="muted">Opções aceitas pela empresa e oferecidas no checkout. A escolha de cada pedido, recebimento e lançamento fica registrada no banco.</p></div></div>
      <form className="form-stack" onSubmit={savePaymentMethods}>
        {paymentMethods.map((method, index) => <div className="inline-form" key={index}>
          <label className="field">Forma {index + 1}<input required minLength={2} maxLength={50} value={method} onChange={(event) => setPaymentMethods(paymentMethods.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>
          <button type="button" className="text-button danger" disabled={paymentsBusy || paymentMethods.length === 1} onClick={() => setPaymentMethods(paymentMethods.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
        </div>)}
        <div className="actions">
          <button type="button" className="secondary" disabled={paymentsBusy || paymentMethods.length >= 10} onClick={() => setPaymentMethods([...paymentMethods, ''])}>Adicionar forma</button>
          <button type="submit" className="primary" disabled={paymentsBusy || loading || !data}>{paymentsBusy ? 'Salvando…' : 'Salvar formas de pagamento'}</button>
        </div>
        <ErrorBox message={paymentsError} />
      </form>
    </section>
    <div className="finance-notice">Registro de movimentações realizadas fora do sistema. Formas comerciais configuradas: {(data?.paymentMethods?.length ? data.paymentMethods : BUSINESS.paymentMethods).join(', ')}. Nenhuma cobrança, transferência ou devolução é executada por esta tela.</div>
    <form className="toolbar" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); applyPeriod(String(values.get('from')), String(values.get('to'))); }}>
      <div className="form-row">
        <label className="field">De<input name="from" type="date" required value={from} onInput={(event) => setFrom(event.currentTarget.value)} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="field">Até<input name="to" type="date" required value={to} onInput={(event) => setTo(event.currentTarget.value)} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <div className="actions">
        <button className="primary" type="submit">Aplicar período</button>
        <button className="secondary" type="button" onClick={() => applyPeriod(localDay(), localDay())}>Hoje</button>
        <button className="secondary" type="button" onClick={() => { const date = new Date(localDay() + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() - 6); applyPeriod(date.toISOString().slice(0, 10), localDay()); }}>7 dias</button>
        <button className="secondary" type="button" onClick={() => applyPeriod(localDay().slice(0, 7) + '-01', localDay())}>Este mês</button>
      </div>
    </form>
    <p className="muted" role="status">{loading ? 'Carregando período…' : `Período aplicado: ${period.from.split('-').reverse().join('/')} a ${period.to.split('-').reverse().join('/')} · Horário de Fortaleza`}</p>
    <ErrorBox message={error} />
    <div className="stat-grid finance-stats">
      {[
        ['Saldo anterior', totals.previous, 'Antes do período'],
        ['Entradas', totals.income, 'Recebimentos registrados'],
        ['Saídas', totals.expense, 'Despesas e devoluções registradas'],
        ['Saldo final', totals.previous + totals.income - totals.expense, 'Saldo financeiro registrado'],
      ].map(([title, value, note]) => <div className="stat-card" key={title as string}>
        <span>{title}</span><strong>{data ? money(value as number) : '—'}</strong><small>{note}</small>
      </div>)}
    </div>
    <section className="panel">
      <div className="section-heading"><h2>Movimentações</h2><span className="subtle">{visible.length} registros · Até 500 por período</span></div>
      <div className="finance-filters">
        <Choice label="Tipo" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todos' }, { value: 'income', label: 'Entradas' }, { value: 'expense', label: 'Saídas' }]} />
        <Choice label="Categoria" value={category} onChange={setCategory} options={[{ value: 'all', label: 'Todas' }, ...Array.from(new Set(rows.map((row) => row.category)))]} />
        <Choice label="Forma" value={method} onChange={setMethod} options={[{ value: 'all', label: 'Todas' }, ...Array.from(new Set(rows.map((row) => row.payment)))]} />
        <Choice label="Pedido vinculado" value={linked} onChange={setLinked} options={[{ value: 'all', label: 'Todos' }, { value: 'yes', label: 'Com pedido' }, { value: 'no', label: 'Sem pedido' }]} />
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Forma</TableHead><TableHead>Valor</TableHead><TableHead>Pedido</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((row) => <TableRow key={row.id}>
          <TableCell>{row.date.split('-').reverse().join('/')}</TableCell>
          <TableCell><button type="button" className="text-button" onClick={() => setDetail(row)}>{row.description}</button><small className="block muted">{row.actor_name}{row.reversed ? ' · Corrigido' : ''}{row.correction_of ? ' · Correção de registro' : ''}</small></TableCell>
          <TableCell>{row.category}</TableCell><TableCell>{row.payment}</TableCell>
          <TableCell className={row.type === 'income' ? 'income' : 'expense'}>{row.type === 'income' ? '+' : '−'} {money(row.amount)}</TableCell>
          <TableCell>{row.order_id ? <a className="text-button" href={'/operacao/pedidos/' + orderNumber(row.order_number)}>#{orderNumber(row.order_number)}</a> : 'Sem pedido'}</TableCell>
          <TableCell>{!row.reversed && !row.correction_of && <button type="button" className="text-button" onClick={() => { setCorrection({ ...row, reason: '', confirmed: false }); setDialogError(''); }}>Corrigir</button>}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      {!loading && !error && !visible.length && <div className="empty-state"><h3>Nenhuma movimentação para os filtros selecionados.</h3><p>Pedidos aparecem abaixo. Só entram no saldo após confirmação de uma entrada pelo administrador.</p></div>}
      <div className="summary-row"><span>Resultado filtrado</span><strong>{money(visible.reduce((sum, row) => sum + (row.type === 'income' ? row.amount : -row.amount), 0))}</strong></div>
    </section>

    <section className="panel">
      <div className="section-heading"><h2>Pedidos do período</h2><span className="subtle">{data?.orders?.length || 0} pedidos · Até 500 por período</span></div>
      <p className="muted">Filtrados pela data do pedido. Os lançamentos acima usam a data efetiva do recebimento ou pagamento.</p>
      <Table>
        <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Conferência financeira</TableHead></TableRow></TableHeader>
        <TableBody>{(data?.orders || []).map((order: Row) => <TableRow key={order.id}>
          <TableCell><a className="text-button" href={'/operacao/pedidos/' + orderNumber(order.number)}>Ver pedido #{orderNumber(order.number)}</a></TableCell>
          <TableCell>{order.name}</TableCell>
          <TableCell>{new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}</TableCell>
          <TableCell>{statusLabels[order.status] || order.status}</TableCell>
          <TableCell>{money(order.total)}</TableCell>
          <TableCell>{order.ledger_id ? 'Entrada registrada' : order.receipt_id ? 'Recebimento informado · entrada pendente' : order.paid ? 'Recebimento antigo · conferir na operação' : 'Recebimento não informado'}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      {!loading && !error && !data?.orders?.length && <div className="empty-state"><h3>Nenhum pedido criado neste período.</h3><p>Amplie as datas para consultar pedidos anteriores.</p></div>}
    </section>

    <Dialog open={Boolean(edit)} onOpenChange={(open) => { if (!open && !busy) setEdit(null); }}>
      <DialogContent className="scroll-dialog">
        <DialogHeader><DialogTitle>{edit?.type === 'income' ? 'Registrar entrada' : 'Registrar saída'}</DialogTitle><DialogDescription>Registre apenas valores efetivamente recebidos ou pagos fora do sistema.</DialogDescription></DialogHeader>
        {edit && <form className="form-stack" onSubmit={save}>
          <label className="field">Descrição<input required minLength={3} maxLength={200} value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></label>
          <div className="form-row">
            <label className="field">Valor (R$)<input type="number" required min="0.01" step="0.01" value={edit.amount / 100 || ''} onChange={(event) => setEdit({ ...edit, amount: Math.round(Number(event.target.value) * 100) })} /></label>
            <label className="field">Data efetiva<input type="date" required max={localDay()} value={edit.date} onChange={(event) => setEdit({ ...edit, date: event.target.value })} /></label>
          </div>
          <Choice label="Categoria" value={edit.category} onChange={(nextCategory) => setEdit({ ...edit, category: nextCategory, orderId: 'none', receiptId: 'none', refundOf: 'none', refundConfirmed: false })} options={serverCategories(edit.type)} />
          <Choice label="Forma de pagamento utilizada" value={edit.payment} onChange={(payment) => setEdit({ ...edit, payment })} options={paymentOptions} />
          {edit.type === 'income' && edit.category === 'Vendas' && <Choice
            label="Vincular ao recebimento conferido"
            value={edit.receiptId}
            onChange={(receiptId) => {
              const receipt = receipts.find((entry) => entry.id === receiptId);
              setEdit({
                ...edit,
                receiptId,
                orderId: receipt?.order_id || 'none',
                ...(receipt ? {
                  amount: receipt.amount,
                  payment: receipt.payment,
                  date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(receipt.received_at)),
                  description: `Venda · pedido #${orderNumber(receipt.order_number)}`,
                } : {}),
              });
            }}
            options={[{ value: 'none', label: 'Venda sem pedido online' }, ...receipts.map((receipt) => ({ value: receipt.id, label: `#${orderNumber(receipt.order_number)} · ${receipt.customer_name} · ${money(receipt.amount)}` }))]}
          />}
          {edit.category === 'Reembolsos' && <>
            <label className="field">Identificador da entrada original<input value={edit.refundOf === 'none' ? '' : edit.refundOf} onChange={(event) => setEdit({ ...edit, refundOf: event.target.value })} required placeholder="Copie em Ver detalhes da entrada" /></label>
            <label className="field">Motivo<textarea required minLength={3} maxLength={300} value={edit.reason} onChange={(event) => setEdit({ ...edit, reason: event.target.value })} /></label>
            <Confirm checked={edit.refundConfirmed} onChange={(refundConfirmed) => setEdit({ ...edit, refundConfirmed })}>Como administrador, confirmo que autorizei e realizei a devolução fora do sistema.</Confirm>
          </>}
          <Confirm checked={edit.confirmed} onChange={(confirmed) => setEdit({ ...edit, confirmed })}>Conferi os dados e confirmo o registro desta movimentação.</Confirm>
          <ErrorBox message={dialogError} />
          <button type="submit" className="primary" disabled={busy || !edit.confirmed || (edit.category === 'Reembolsos' && !edit.refundConfirmed)}>{busy ? 'Registrando…' : 'Confirmar registro'}</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(correction)} onOpenChange={(open) => { if (!open && !busy) setCorrection(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Corrigir registro</DialogTitle><DialogDescription>Será criado um registro de valor inverso na data de hoje, preservando o histórico. Isso não devolve dinheiro.</DialogDescription></DialogHeader>
        {correction && <form className="form-stack" onSubmit={async (event) => {
          event.preventDefault(); setBusy(true); setDialogError('');
          try { await api('/api/finance/' + correction.id, { reason: correction.reason, confirmed: correction.confirmed }); setCorrection(null); await load(); toast.success('Correção registrada'); }
          catch (cause) { setDialogError((cause as Error).message); }
          finally { setBusy(false); }
        }}>
          <strong>{correction.description} · {money(correction.amount)}</strong>
          <label className="field">Motivo da correção<textarea required minLength={3} maxLength={300} value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} /></label>
          <Confirm checked={correction.confirmed} onChange={(confirmed) => setCorrection({ ...correction, confirmed })}>Confirmo a correção apenas do registro financeiro.</Confirm>
          <ErrorBox message={dialogError} /><button type="submit" className="primary" disabled={busy || !correction.confirmed}>Confirmar correção</button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Detalhes da movimentação</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>
        {detail && <div className="form-stack">
          <strong>{money(detail.amount)}</strong><p>{detail.type === 'income' ? 'Entrada' : 'Saída'} · {detail.category} · {detail.payment}</p>
          <label className="field">Identificador do registro<input readOnly value={detail.id} onFocus={(event) => event.target.select()} /></label>
          <p>Confirmado por {detail.actor_name} em {new Date(detail.confirmed_at).toLocaleString('pt-BR')}.</p>
          {detail.reason && <p>Motivo: {detail.reason}</p>}
          {detail.receipt_id && <p className="small-note">Recebimento conferido: {detail.receipt_id}</p>}
          {detail.order_id && <a className="text-button" href={'/operacao/pedidos/' + orderNumber(detail.order_number)}>Ver pedido vinculado #{orderNumber(detail.order_number)}</a>}
          {detail.refund_of && <p className="small-note">Entrada reembolsada: {detail.refund_of}</p>}
          {detail.correction_of && <p className="small-note">Registro corrigido: {detail.correction_of}</p>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
