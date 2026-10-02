import { z } from "zod";
import { db, endpoint, requireUser, body, json, now, uuid, AppError } from "@/lib/server";

const input = z.object({
  key: z.string().uuid(),
  orderId: z.string().uuid(),
  amount: z.number().int().positive().max(100000000),
  payment: z.string().trim().min(2).max(50),
  confirmed: z.literal(true),
});

type Receipt = {
  id: string;
  request_key: string;
  order_id: string;
  amount: number;
  payment: string;
  received_at: string;
};

function sameReceipt(receipt: Receipt, value: z.infer<typeof input>) {
  return receipt.order_id === value.orderId && receipt.amount === value.amount && receipt.payment === value.payment;
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    await requireUser(request, ["admin"]);
    const rows = await db().prepare(`
      SELECT receipts.id,receipts.order_id,receipts.amount,receipts.payment,receipts.received_at,
        receipts.reported_by,user.name AS reported_by_name,orders.name AS customer_name,orders.number AS order_number,
        ledger.id AS ledger_id
      FROM receipts
      JOIN orders ON orders.id=receipts.order_id
      JOIN user ON user.id=receipts.reported_by
      LEFT JOIN ledger ON ledger.receipt_id=receipts.id AND ledger.correction_of IS NULL
      ORDER BY receipts.received_at DESC LIMIT 500
    `).all();
    return json({ receipts: rows.results });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["operator", "admin"]);
    const value = input.parse(await body(request));
    const existing = await db().prepare("SELECT * FROM receipts WHERE request_key=? OR order_id=? LIMIT 1").bind(value.key, value.orderId).first<Receipt>();
    if (existing) {
      if (!sameReceipt(existing, value)) throw new AppError("Este pedido já possui outro recebimento informado.", 409);
      return json({ id: existing.id, recovered: true });
    }

    const order = await db().prepare("SELECT id,total,payment,status FROM orders WHERE id=?").bind(value.orderId).first<{ id: string; total: number; payment: string; status: string }>();
    if (!order) throw new AppError("Pedido não encontrado.", 404);
    if (order.status === "cancelled") throw new AppError("Recebimento não pode ser informado em pedido cancelado.");
    if (value.amount !== order.total || value.payment !== order.payment) {
      throw new AppError("Valor e forma de pagamento devem corresponder ao pedido confirmado.");
    }

    const id = uuid();
    const timestamp = now();
    const mutation = uuid();
    try {
      await db().batch([
        db().prepare("INSERT INTO receipts (id,request_key,order_id,amount,payment,received_at,reported_by,created_at) VALUES (?,?,?,?,?,?,?,?)")
          .bind(id, value.key, value.orderId, value.amount, value.payment, timestamp, user.id, timestamp),
        db().prepare("UPDATE orders SET paid=1,received_by=?,updated_at=?,revision=revision+1,mutation=? WHERE id=?")
          .bind(user.id, timestamp, mutation, value.orderId),
        db().prepare("INSERT INTO history (id,order_id,status,actor,reason,created_at) SELECT ?,id,status,?,'Recebimento externo informado pela equipe. Sem lançamento financeiro automático.',? FROM orders WHERE id=? AND mutation=?")
          .bind(uuid(), user.id, timestamp, value.orderId, mutation),
      ]);
    } catch (error) {
      const recovered = await db().prepare("SELECT * FROM receipts WHERE request_key=? OR order_id=? LIMIT 1").bind(value.key, value.orderId).first<Receipt>();
      if (recovered && sameReceipt(recovered, value)) return json({ id: recovered.id, recovered: true });
      if (recovered) throw new AppError("Este pedido já possui outro recebimento informado.", 409);
      throw error;
    }
    return json({ id }, 201);
  });
}
