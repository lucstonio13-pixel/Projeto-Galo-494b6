import { z } from "zod";
import { db, endpoint, requireUser, body, json, now, uuid, AppError } from "@/lib/server";
import { localDay, validDate } from "@/lib/order-rules";

const input = z.object({
  key: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().min(1).max(100000000),
  description: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(100),
  date: z.string().refine(validDate),
  payment: z.string().trim().min(2).max(50),
  orderId: z.string().uuid().optional(),
  receiptId: z.string().uuid().optional(),
  refundOf: z.string().uuid().optional(),
  reason: z.string().trim().max(300).default(""),
  confirmed: z.literal(true),
  refundConfirmed: z.boolean().default(false),
});

type FinanceInput = z.infer<typeof input>;
type ExistingEntry = { id: string; request_hash: string };

async function fingerprint(value: FinanceInput) {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...value, key: undefined }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recover(entry: ExistingEntry | null, requestHash: string) {
  if (!entry) return null;
  if (entry.request_hash && entry.request_hash !== requestHash) {
    throw new AppError("Esta tentativa financeira já foi usada com outro conteúdo.", 409);
  }
  return entry;
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    await requireUser(request, ["admin"]);
    const query = new URL(request.url).searchParams;
    const from = query.get("from") || localDay().slice(0, 7) + "-01";
    const to = query.get("to") || localDay();
    if (!validDate(from) || !validDate(to) || from > to) throw new AppError("Período inválido.");

    const totals = await db().prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date < ? THEN CASE WHEN type='income' THEN amount ELSE -amount END ELSE 0 END),0) AS previous,
        COALESCE(SUM(CASE WHEN date >= ? AND type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN date >= ? AND type='expense' THEN amount ELSE 0 END),0) AS expense
      FROM ledger WHERE date<=?
    `).bind(from, from, from, to).first();
    const start = new Date(from + 'T00:00:00-03:00').toISOString();
    const end = new Date(to + 'T00:00:00-03:00');
    end.setUTCDate(end.getUTCDate() + 1);
    const [rows, categories, orders] = await Promise.all([
      db().prepare(`
        SELECT ledger.*,user.name AS actor_name,orders.number AS order_number FROM ledger
        JOIN user ON user.id=ledger.actor
        LEFT JOIN orders ON orders.id=ledger.order_id
        WHERE date>=? AND date<=? ORDER BY date DESC,confirmed_at DESC LIMIT 500
      `).bind(from, to).all(),
      db().prepare("SELECT id,name,type FROM financial_categories WHERE active=1 ORDER BY type,name").all(),
      db().prepare(`
        SELECT orders.id,orders.number,orders.name,orders.created_at,orders.total,orders.status,orders.paid,
          receipts.id AS receipt_id,ledger.id AS ledger_id
        FROM orders
        LEFT JOIN receipts ON receipts.order_id=orders.id
        LEFT JOIN ledger ON ledger.receipt_id=receipts.id AND ledger.correction_of IS NULL AND ledger.reversed=0
        WHERE orders.created_at>=? AND orders.created_at<?
        ORDER BY orders.created_at DESC LIMIT 500
      `).bind(start, end.toISOString()).all(),
    ]);
    return json({ totals, entries: rows.results, categories: categories.results, orders: orders.results, from, to });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["admin"]);
    const value = input.parse(await body(request));
    const requestHash = await fingerprint(value);
    const prior = recover(await db().prepare("SELECT id,request_hash FROM ledger WHERE request_key=?").bind(value.key).first<ExistingEntry>(), requestHash);
    if (prior) return json({ id: prior.id, recovered: true });
    if (value.date > localDay()) throw new AppError("Registre somente movimentações já realizadas.");

    const category = await db().prepare("SELECT id FROM financial_categories WHERE name=? AND type=? AND active=1").bind(value.category, value.type).first();
    if (!category) throw new AppError("Categoria incompatível com o lançamento.");

    const id = uuid();
    const timestamp = now();
    const refund = value.category === "Reembolsos";
    if (refund && (!value.refundConfirmed || !value.refundOf || value.reason.length < 3)) {
      throw new AppError("Confirme a autorização e a realização externa do reembolso, informe motivo e entrada original.");
    }
    if (!refund && value.refundOf) throw new AppError("Vínculo de reembolso inválido.");
    if (refund && (value.orderId || value.receiptId)) throw new AppError("O reembolso herda os vínculos da entrada original.");

    if (value.orderId || value.receiptId) {
      if (refund || value.type !== "income" || value.category !== "Vendas" || !value.orderId || !value.receiptId) {
        throw new AppError("Vínculo de venda inválido.");
      }
      const receipt = await db().prepare(`
        SELECT receipts.amount,receipts.payment,receipts.order_id
        FROM receipts WHERE receipts.id=? AND receipts.order_id=?
      `).bind(value.receiptId, value.orderId).first<{ amount: number; payment: string; order_id: string }>();
      if (!receipt || value.amount !== receipt.amount || value.payment !== receipt.payment) {
        throw new AppError("A entrada deve corresponder ao recebimento externo conferido.");
      }
    }

    try {
      if (refund) {
        const result = await db().prepare(`
          INSERT INTO ledger (id,request_key,request_hash,type,amount,description,category,date,payment,order_id,refund_of,actor,reason,confirmed_at)
          SELECT ?,?,?,'expense',?,?,?,?,?,original.order_id,?,?,?,?
          FROM ledger original
          WHERE original.id=? AND original.type='income' AND original.reversed=0 AND original.correction_of IS NULL
            AND original.amount-COALESCE((SELECT SUM(amount) FROM ledger WHERE refund_of=original.id AND reversed=0),0)>=?
        `).bind(id, value.key, requestHash, value.amount, value.description, value.category, value.date, value.payment, value.refundOf, user.id, value.reason, timestamp, value.refundOf, value.amount).run();
        if (!result.meta.changes) throw new AppError("Entrada inválida ou valor maior que o saldo disponível para devolução.");
      } else {
        await db().prepare(`
          INSERT INTO ledger (id,request_key,request_hash,type,amount,description,category,date,payment,order_id,receipt_id,actor,reason,confirmed_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(id, value.key, requestHash, value.type, value.amount, value.description, value.category, value.date, value.payment, value.orderId || null, value.receiptId || null, user.id, value.reason, timestamp).run();
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      const duplicate = recover(await db().prepare("SELECT id,request_hash FROM ledger WHERE request_key=?").bind(value.key).first<ExistingEntry>(), requestHash);
      if (duplicate) return json({ id: duplicate.id, recovered: true });
      if (value.orderId || value.receiptId) throw new AppError("Este recebimento já possui uma entrada. Confira os registros.", 409);
      throw error;
    }
    return json({ id }, 201);
  });
}
