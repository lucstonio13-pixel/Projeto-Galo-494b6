'use client';
import { useEffect,useState } from 'react';
export type Viewer={id:string;name:string;email:string;phone:string;role:string};
export async function api(path:string,body?:unknown,method='POST'):Promise<Record<string,any>>{
 const res=await fetch(path,{method:body===undefined?'GET':method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
 let data:Record<string,any>;try{const parsed=await res.json();if(!parsed||typeof parsed!=='object')throw new Error();data=parsed as Record<string,any>}catch{throw new Error('Resposta indisponível. Tente novamente.');}if(!res.ok)throw new Error(typeof data.error==='string'?data.error:typeof data.message==='string'?data.message:'Não foi possível concluir.');return data;
}
export function useViewer(){const [user,setUser]=useState<Viewer|null>(null),[initialized,setInitialized]=useState<boolean|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{api('/api/me').then(d=>{setUser(d.user);setInitialized(Boolean(d.initialized))}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);return {user,initialized,loading,error};}
export function readCart(){try{return JSON.parse(localStorage.getItem('galeteria-cart')||'[]')}catch{return []}}
export function saveCart(cart:unknown){localStorage.setItem('galeteria-cart',JSON.stringify(cart));}
