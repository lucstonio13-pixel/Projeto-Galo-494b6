import { current, endpoint, getSettings, json } from '@/lib/server';
export async function GET(r:Request){return endpoint(r,async()=>json({user:await current(r),initialized:(await getSettings()).initialized}));}
