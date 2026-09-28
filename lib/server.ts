import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
export const db = () => { if(!env.DB) throw new Error('Banco indisponível');return env.DB; };
export function runtime(key:string) { return (env as unknown as Record<string,string>)[key] || process.env[key] || ''; }
export function auth() {
 const secret=runtime('BETTER_AUTH_SECRET'); const baseURL=runtime('BETTER_AUTH_URL');
 if(!secret || !baseURL) throw new Error('Autenticação ainda não configurada.');
 return betterAuth({appName:'Galeteria',baseURL,secret,database:drizzleAdapter(getDb(),{provider:'sqlite',schema,transaction:false}),emailAndPassword:{enabled:true,minPasswordLength:6,maxPasswordLength:128},session:{expiresIn:60*60*24*7,cookieCache:{enabled:false}},rateLimit:{enabled:true,storage:'database',window:60,max:30},advanced:{ipAddress:{ipAddressHeaders:['cf-connecting-ip']}}});
}
export class AppError extends Error {constructor(message:string,public status=400){super(message)}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function current(request:Request){
 const s=await auth().api.getSession({headers:request.headers});if(!s)return null;
 const m=await db().prepare('SELECT role, active FROM members WHERE user_id = ?').bind(s.user.id).first<{role:string;active:number}>();
 return {id:s.user.id,name:s.user.name,email:s.user.email,role:m?.active?m.role:'customer'};
}
export async function requireUser(r:Request,roles?:string[]){const u=await current(r);if(!u)throw new AppError('Entre na sua conta para continuar.',401);if(roles&&!roles.includes(u.role))throw new AppError('Você não tem permissão para esta ação.',403);return u;}
export async function body(r:Request){if(Number(r.headers.get('content-length')||0)>32768)throw new AppError('Dados muito grandes.',413);const text=await r.text();if(text.length>32768)throw new AppError('Dados muito grandes.',413);try{return JSON.parse(text)}catch{throw new AppError('Dados inválidos.')}}
export function sameOrigin(r:Request){const origin=r.headers.get('origin');const expected=runtime('BETTER_AUTH_URL');if(!origin || origin!==new URL(expected).origin)throw new AppError('Origem da solicitação inválida.',403);}
export async function endpoint(r:Request,fn:()=>Promise<Response>){try{if(r.method!=='GET')sameOrigin(r);return await fn()}catch(e){if(e instanceof AppError)return json({error:e.message},e.status);if(e instanceof Error&&e.name==='ZodError')return json({error:'Revise os campos e tente novamente.'},400);console.error('Falha na operação',e instanceof Error?e.message:'erro');return json({error:'Não foi possível concluir. Tente novamente.'},500)}}
export const now=()=>new Date().toISOString();
export const uuid=()=>crypto.randomUUID();
export type Settings={demo:boolean;open:boolean;delivery:boolean;fee:number;areas:string[];payments:string[];address:string;contact:string;start:string;end:string;days:number[]};
export const defaults:Settings={demo:true,open:true,delivery:false,fee:500,areas:[],payments:['Dinheiro','Cartão na retirada'],address:'Endereço de demonstração — a confirmar',contact:'',start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]};
export async function getSettings(){const row=await db().prepare('SELECT value,revision FROM settings WHERE id=1').first<{value:string;revision:number}>();return {settings:row?JSON.parse(row.value) as Settings:defaults,revision:row?.revision??0,initialized:!!row};}
export function accepting(s:Settings){if(!s.open)return false;const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Fortaleza',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const v=(t:string)=>parts.find(p=>p.type===t)?.value||'';const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(v('weekday'));const time=v('hour')+':'+v('minute');return s.days.includes(day)&&time>=s.start&&time<=s.end;}
