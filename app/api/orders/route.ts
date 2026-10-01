import { z } from "zod";
import { db, endpoint, requireUser, body, json, getSettings, accepting, now, uuid, AppError } from "@/lib/server";
import { configuredUnitPrice, selectedOptions, selectionError } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-server";

const selection = z.object({
  groupId: z.string().max(64),
  optionIds: z.array(z.string().max(64)).max(20).refine((ids) => new Set(ids).size === ids.length),
});
const input = z.object({
  key: z.string().uuid(),
  phone: z.string().trim().max(20).refine((value) => {
    const digits = value.replace(/\D/g, "");
    return /^[\d\s()+-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
  }, "Informe um telefone válido com DDD."),
  mode: z.enum(["pickup", "delivery"]),
  address: z.string().max(400).default(""),
  area: z.string().max(100).default(""),
  payment: z.string().max(50),
  note: z.string().max(300).default(""),
  fee: z.number().int().nonnegative(),
  items: z.array(z.object({
    id: z.string().max(64),
    quantity: z.number().int().min(1).max(20),
    price: z.number().int().nonnegative(),
    note: z.string().max(160).default(""),
    selections: z.array(selection).max(20).default([]).refine((items) => new Set(items.map((item) => item.groupId)).size === items.length),
  })).min(1).max(30),
});

type OrderInput = z.infer<typeof input>;
type ExistingOrder = { id: string; request_hash: string };
const visibleColumns = "id,user_id,name,email,phone,mode,address,area,payment,items,subtotal,fee,total,status,paid,created_at,updated_at,revision,note";

async function fingerprint(order: OrderInput) {
  const canonical = {
    phone: order.phone,
    mode: order.mode,
    address: order.address.trim(),
    area: order.area.trim(),
    payment: order.payment,
    note: order.note,
    fee: order.fee,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      note: item.note,
      selections: item.selections
        .map((selection) => ({ groupId: selection.groupId, optionIds: [...selection.optionIds].sort() }))
        .sort((left, right) => left.groupId.localeCompare(right.groupId)),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recovered(existing: ExistingOrder | null, requestHash: string) {
  if (!existing) return null;
  if (existing.request_hash && existing.request_hash !== requestHash) {
    throw new AppError("Esta tentativa já foi usada com outro conteúdo. Volte ao carrinho e inicie um novo envio.", 409);
  }
  return existing;
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request);
    const requestKey = new URL(request.url).searchParams.get("requestKey");
    if (requestKey) {
      const key = z.string().uuid().parse(requestKey);
      const order = await db().prepare("SELECT id FROM orders WHERE user_id=? AND request_key=?").bind(user.id, key).first();
      if (!order) throw new AppError("A tentativa ainda não gerou um pedido.", 404);
      return json(order);
    }
    const query = user.role === "customer"
      ? db().prepare(`SELECT ${visibleColumns} FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 200`).bind(user.id)
      : db().prepare(`SELECT ${visibleColumns} FROM orders ORDER BY created_at DESC LIMIT 200`);
    return json({ orders: (await query.all()).results });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request);
    const order = input.parse(await body(request));
    const requestHash = await fingerprint(order);
    const existing = await db().prepare("SELECT id,request_hash FROM orders WHERE user_id=? AND request_key=?").bind(user.id, order.key).first<ExistingOrder>();
    const prior = recovered(existing, requestHash);
    if (prior) return json({ id: prior.id, recovered: true });

    const { settings, initialized } = await getSettings();
    if (!initialized || !accepting(settings)) throw new AppError("A loja está fechada ou com pedidos pausados.", 409);
    if (!settings.payments.includes(order.payment)) throw new AppError("Forma de pagamento indisponível.");
    if (order.mode === "pickup" && !settings.pickup) throw new AppError("A retirada está indisponível.");
    if (order.mode === "delivery" && (!settings.delivery || !settings.areas.includes(order.area) || order.address.trim().length < 8)) {
      throw new AppError("Informe um endereço dentro da área atendida.");
    }

    const { products } = await getCatalog(false);
    const items = order.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.id);
      if (!product || !product.available) throw new AppError("Um item ficou indisponível. Revise o carrinho.", 409);
      const optionsError = selectionError(product, item.selections);
      if (optionsError) throw new AppError(optionsError, 409);
      const currentPrice = configuredUnitPrice(product, item.selections);
      if (currentPrice === null || currentPrice !== item.price) {
        throw new AppError("O preço ou as opções de um item mudaram. Atualize o cardápio e confirme os novos valores.", 409);
      }
      return {
        id: product.id,
        name: product.name,
        price: currentPrice,
        quantity: item.quantity,
        note: item.note,
        options: selectedOptions(product, item.selections).map((option) => ({ id: option.id, name: option.name, price: option.price })),
      };
    });
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const fee = order.mode === "delivery" ? settings.fee : 0;
    if (order.fee !== fee) throw new AppError("A taxa mudou. Revise o pedido.", 409);
    const id = uuid();
    const timestamp = now();
    const results = await db().batch([
      db()
        .prepare("INSERT INTO orders (id,user_id,request_key,request_hash,name,email,phone,mode,address,area,payment,items,subtotal,fee,total,status,created_at,updated_at,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'received',?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING")
        .bind(id, user.id, order.key, requestHash, user.name, user.email, order.phone, order.mode, order.mode === "delivery" ? order.address.trim() : settings.address, order.mode === "delivery" ? order.area : "", order.payment, JSON.stringify(items), subtotal, fee, subtotal + fee, timestamp, timestamp, order.note),
      db()
        .prepare("INSERT INTO history (id,order_id,status,actor,reason,created_at) SELECT ?,id,'received',?,'Pedido criado',? FROM orders WHERE id=?")
        .bind(uuid(), user.id, timestamp, id),
    ]);
    const stored = await db().prepare("SELECT id,request_hash FROM orders WHERE user_id=? AND request_key=?").bind(user.id, order.key).first<ExistingOrder>();
    const result = recovered(stored, requestHash);
    if (!result) throw new AppError("Não foi possível recuperar o pedido criado.", 500);
    return json({ id: result.id, recovered: !results[0].meta.changes }, results[0].meta.changes ? 201 : 200);
  });
}
