import { db, endpoint, getSettings, accepting, json } from '@/lib/server';
import { demoProducts } from '@/lib/catalog';
export async function GET(r:Request){return endpoint(r,async()=>{const {settings,initialized}=await getSettings();const rows=await db().prepare('SELECT * FROM products ORDER BY rowid').all();return json({products:initialized?rows.results:demoProducts,settings,accepting:initialized&&accepting(settings)});});}
