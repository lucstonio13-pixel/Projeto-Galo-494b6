import { z } from "zod";
import { db, endpoint, requireUser, json, body, AppError, uuid, now, ensureOrderNumbers } from "@/lib/server";
import { canTransition } from "@/lib/order-rules";
import { isOrderNumber } from "@/lib/order-number";

type Order = {
  id: string;
  number: number;
  user_id: string;
  revision: number;
  status: string;
  mode: string;
  paid: number;
  request_key?: string;
  request_hash?: string;
  mutation?: string;
  received_by?: string;
  [key: string]: unknown;
};

function visible(order: Order) {
  const copy = { ...order };
  delete copy.request_key;
  delete copy.request_hash;
  delete copy.mutation;
  delete copy.received_by;
  return copy;
}

async function find(request: Request, id: string) {
  const user = await requireUser(request);
  await ensureOrderNumbers();
  const order = isOrderNumber(id)
    ? await db().prepare("SELECT orders.*,(SELECT id FROM receipts WHERE order_id=orders.id) AS receipt_id FROM orders WHERE number=?").bind(Number(id)).first<Order>()
    : await db().prepare("SELECT orders.*,(SELECT id FROM receipts WHERE order_id=orders.id) AS receipt_id FROM orders WHERE id=?").bind(id).first<Order>();
  if (!order || (user.role === "customer" && order.user_id !== user.id)) {
    throw new AppError("Pedido não encontrado.", 404);
  }
  return { user, order };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(request, async () => {
    const { user, order } = await find(request, (await params).id);
    const history = user.role === "customer"
      ? await db().prepare(`
          SELECT status,reason,created_at,
            CASE WHEN actor=? THEN 'Cliente' ELSE 'Equipe' END AS actor_name
          FROM history WHERE order_id=? ORDER BY created_at
        `).bind(order.user_id, order.id).all()
      : await db().prepare(`
          SELECT history.status,history.reason,history.created_at,history.actor,
            COALESCE(user.name,'Responsável não identificado') AS actor_name
          FROM history LEFT JOIN user ON user.id=history.actor
          WHERE history.order_id=? ORDER BY history.created_at
        `).bind(order.id).all();
    return json({ order: visible(order), history: history.results });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(request, async () => {
    await requireUser(request, ["operator", "admin"]);
    const { order, user } = await find(request, (await params).id);
    const input = z.object({
      revision: z.number().int(),
      status: z.enum(["accepted", "preparing", "ready", "out", "completed", "cancelled"]),
      reason: z.string().trim().max(300).default(""),
    }).parse(await body(request));

    if (input.revision !== order.revision) {
      throw new AppError("O pedido foi atualizado por outra pessoa. Os dados foram recarregados.", 409);
    }
    if (!canTransition(order.status, input.status, order.mode)) {
      throw new AppError("Mudança de status inválida.");
    }
    if (input.status === "cancelled" && input.reason.length < 3) {
      throw new AppError("Informe o motivo do cancelamento.");
    }

    const mutation = uuid();
    const timestamp = now();
    const results = await db().batch([
      db().prepare(`
        UPDATE orders SET status=?,paid=?,received_by=?,updated_at=?,revision=revision+1,mutation=?
        WHERE id=? AND revision=?
      `).bind(
        input.status,
        order.paid,
        order.received_by,
        timestamp,
        mutation,
        order.id,
        input.revision,
      ),
      db().prepare(`
        INSERT INTO history (id,order_id,status,actor,reason,created_at)
        SELECT ?,id,status,?,?,? FROM orders WHERE id=? AND mutation=?
      `).bind(
        uuid(),
        user.id,
        input.reason,
        timestamp,
        order.id,
        mutation,
      ),
    ]);
    if (!results[0].meta.changes) {
      throw new AppError("Outro operador atualizou este pedido. Os dados foram recarregados.", 409);
    }
    return json({ ok: true });
  });
}
