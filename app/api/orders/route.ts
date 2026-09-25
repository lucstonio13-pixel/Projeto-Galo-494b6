import { z } from 'zod';
import { db, endpoint, requireUser, body, json, getSettings, accepting, now, uuid, AppError } from '@/lib/server';
import type { Product } from '@/lib/catalog';
const input=z.object({key:z.string().uuid(),phone:z.string().regex(/^[\d\s()+-]{10,20}$/),mode:z.enum(['pickup','delivery']),address:z.string().max(400).default(''),area:z.string().max(100).default(''),payment:z.string().max(50),note:z.string().max(300).default(''),fee:z.number().int().nonnegative(),items:z.array(z.object({id:z.string().max(64),quantity:z.number().int().min(1).max(20),price:z.number().int().nonnegative(),note:z.string().max(160).default('')})).min(1).max(30)});
export async function GET(r:Request){return endpoint(r,async()=>{const u=await requireUser(r);const q=u.role==='customer'?db().prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 200').bind(u.id):db().prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');return json({orders:(await q.all()).results});});}
export async function POST(r:Request){return endpoint(r,async()=>{
 const u=await requireUser(r);const b=input.parse(await body(r));const existing=await db().prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').bind(u.id,b.key).first();if(existing)return json(existing);
 const {settings:s,initialized}=await getSettings();if(!initialized||!accepting(s))throw new AppError('A loja está fechada ou com pedidos pausados.',409);
 if(!s.payments.includes(b.payment))throw new AppError('Forma de pagamento indisponível.');
 if(b.mode==='delivery'&&(!s.delivery||!s.areas.includes(b.area)||b.address.trim().length<8))throw new AppError('Informe um endereço dentro da área atendida.');
 if(new Set(b.items.map(i=>i.id)).size!==b.items.length)throw new AppError('Há itens repetidos no pedido.');
 const products=(await db().prepare('SELECT * FROM products').all<Product>()).results;
 const items=b.items.map(i=>{const p=products.find(p=>p.id===i.id);if(!p||!p.available)throw new AppError('Um item ficou indisponível. Revise o carrinho.',409);if(p.price!==i.price)throw new AppError('O preço de um item mudou. Atualize o cardápio e confirme os novos valores.',409);return {id:p.id,name:p.name,price:p.price,quantity:i.quantity,note:i.note};});
 const subtotal=items.reduce((n,i)=>n+i.price*i.quantity,0),fee=b.mode==='delivery'?s.fee:0;if(b.fee!==fee)throw new AppError('A taxa mudou. Revise o pedido.',409);
 const id=uuid(),stamp=now();
 await db().batch([db().prepare("INSERT INTO orders (id,user_id,request_key,name,phone,mode,address,payment,items,subtotal,fee,total,status,created_at,updated_at,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'received',?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING").bind(id,u.id,b.key,u.name,b.phone,b.mode,b.mode==='delivery'?b.address+' — '+b.area:'Retirada',b.payment,JSON.stringify(items),subtotal,fee,subtotal+fee,stamp,stamp,b.note),db().prepare("INSERT INTO history (id,order_id,status,actor,reason,created_at) SELECT ?,id,'received',?,'Pedido criado',? FROM orders WHERE id=?").bind(uuid(),u.id,stamp,id)]);
 return json(await db().prepare('SELECT id FROM orders WHERE user_id=? AND request_key=?').bind(u.id,b.key).first(),201);
 });}
