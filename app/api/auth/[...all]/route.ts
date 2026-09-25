import { auth, json } from '@/lib/server';
async function handle(request:Request){try{return await auth().handler(request)}catch{ return json({error:'Login indisponível no momento. Tente novamente.'},503); }}
export const GET=handle;
export const POST=handle;
