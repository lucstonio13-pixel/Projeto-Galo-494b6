import { z } from 'zod';
import { db, endpoint, requireUser, body, json, now, uuid, AppError } from '@/lib/server';

const quantity = z.number().finite().min(0).max(1000000).refine(value => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.00001, 'Use até três casas decimais.');
const create = z.object({ action: z.literal('create'), key: z.string().uuid(), name: z.string().trim().min(2).max(100), kind: z.enum(['product', 'ingredient', 'packaging']), unit: z.enum(['un', 'kg', 'g', 'L', 'ml']), productId: z.string().min(1).max(64).optional(), quantity, minimum: quantity });
const movement = z.object({ action: z.literal('movement'), key: z.string().uuid(), itemId: z.string().uuid(), type: z.enum(['in', 'out']), quantity: quantity.refine(value => value > 0), reason: z.string().trim().min(3).max(300), confirmed: z.literal(true) });

async function fingerprint(value: unknown) {
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
 return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: Request) {
 return endpoint(request, async () => {
  await requireUser(request, ['admin', 'operator']);
  const [items, movements, products] = await Promise.all([
   db().prepare('SELECT inventory_items.*,products.name AS product_name FROM inventory_items LEFT JOIN products ON products.id=inventory_items.product_id ORDER BY inventory_items.name').all(),
   db().prepare('SELECT inventory_movements.*,inventory_items.name,inventory_items.unit,user.name AS actor_name FROM inventory_movements JOIN inventory_items ON inventory_items.id=inventory_movements.item_id JOIN user ON user.id=inventory_movements.actor ORDER BY inventory_movements.created_at DESC LIMIT 200').all(),
   db().prepare('SELECT id,name FROM products ORDER BY name').all(),
  ]);
  return json({ items: items.results, movements: movements.results, products: products.results });
 });
}

export async function POST(request: Request) {
 return endpoint(request, async () => {
  const user = await requireUser(request, ['admin', 'operator']);
  const value = z.discriminatedUnion('action', [create, movement]).parse(await body(request));
  if (value.action === 'create' && user.role !== 'admin') throw new AppError('Somente o administrador cadastra itens de estoque.', 403);
  const hash = await fingerprint({ ...value, key: undefined });
  const table = value.action === 'create' ? 'inventory_items' : 'inventory_movements';
  const prior = await db().prepare(`SELECT id,request_hash FROM ${table} WHERE request_key=?`).bind(value.key).first<{id:string;request_hash:string}>();
  if (prior) {
   if (prior.request_hash !== hash) throw new AppError('Esta tentativa já foi utilizada com outros dados.', 409);
   return json({ id: prior.id, recovered: true });
  }
  const id = uuid(), timestamp = now();
  try {
   if (value.action === 'create') {
    if (value.productId && (value.kind !== 'product' || value.unit !== 'un' || !Number.isInteger(value.quantity) || !Number.isInteger(value.minimum))) throw new AppError('Produtos vinculados usam unidades inteiras.');
    if (value.productId && !(await db().prepare('SELECT id FROM products WHERE id=?').bind(value.productId).first())) throw new AppError('Produto não encontrado.', 404);
    if (value.productId && await db().prepare('SELECT id FROM inventory_items WHERE product_id=?').bind(value.productId).first()) throw new AppError('Este produto já possui controle de estoque.', 409);
    const statements = [db().prepare('INSERT INTO inventory_items (id,request_key,request_hash,name,kind,unit,product_id,quantity,minimum,created_at) VALUES (?,?,?,?,?,?,?,0,?,?)').bind(id,value.key,hash,value.name,value.kind,value.unit,value.productId || null,Math.round(value.minimum*1000),timestamp)];
    if (value.quantity > 0) statements.push(db().prepare('INSERT INTO inventory_movements (id,request_key,request_hash,item_id,delta,kind,reason,actor,created_at) VALUES (?,?,?,?,?,\'initial\',\'Saldo inicial\',?,?)').bind(uuid(),uuid(),hash,id,Math.round(value.quantity*1000),user.id,timestamp));
    await db().batch(statements);
   } else {
    const item = await db().prepare('SELECT product_id FROM inventory_items WHERE id=?').bind(value.itemId).first<{product_id:string|null}>();
    if (!item) throw new AppError('Item não encontrado.', 404);
    if (item.product_id && !Number.isInteger(value.quantity)) throw new AppError('Produtos vinculados usam unidades inteiras.');
    await db().prepare('INSERT INTO inventory_movements (id,request_key,request_hash,item_id,delta,kind,reason,actor,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,value.key,hash,value.itemId,Math.round(value.quantity*1000)*(value.type==='out'?-1:1),value.type,value.reason,user.id,timestamp).run();
   }
  } catch (error) {
   if (error instanceof AppError) throw error;
   const recovered = await db().prepare(`SELECT id,request_hash FROM ${table} WHERE request_key=?`).bind(value.key).first<{id:string;request_hash:string}>();
   if (recovered?.request_hash === hash) return json({id:recovered.id,recovered:true});
   if (recovered) throw new AppError('Esta tentativa já foi utilizada com outros dados.',409);
   if (String(error).includes('inventory_quantity_nonnegative')) throw new AppError('Saldo insuficiente. Recarregue o estoque.',409);
   if (String(error).includes('UNIQUE')) throw new AppError('Item já cadastrado ou movimentação duplicada.',409);
   throw error;
  }
  return json({id},201);
 });
}
