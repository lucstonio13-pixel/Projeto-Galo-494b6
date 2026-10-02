'use client';
import { useEffect,useState } from 'react';
export type Viewer={id:string;name:string;email:string;phone:string;role:string};
type ViewerResponse={user:Viewer|null;initialized:boolean};
let viewerRequest:Promise<ViewerResponse>|null=null;
let viewerCache:ViewerResponse|null=null;
let viewerCachedAt=0;
export async function api(path:string,body?:unknown,method='POST'):Promise<Record<string,any>>{
 const res=await fetch(path,{method:body===undefined?'GET':method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
 let data:Record<string,any>;try{const parsed=await res.json();if(!parsed||typeof parsed!=='object')throw new Error();data=parsed as Record<string,any>}catch{throw new Error('Resposta indisponível. Tente novamente.');}if(!res.ok)throw new Error(typeof data.error==='string'?data.error:typeof data.message==='string'?data.message:'Não foi possível concluir.');return data;
}
function loadViewer(){
 if(viewerCache&&Date.now()-viewerCachedAt<30000)return Promise.resolve(viewerCache);
 if(!viewerRequest)viewerRequest=api('/api/me').then(data=>{const value={user:(data.user as Viewer|null)||null,initialized:Boolean(data.initialized)};viewerCache=value;viewerCachedAt=Date.now();return value}).finally(()=>{viewerRequest=null});
 return viewerRequest;
}
export function clearViewerCache(){viewerCache=null;viewerCachedAt=0;viewerRequest=null;}
export function useViewer(){const [user,setUser]=useState<Viewer|null>(viewerCache?.user||null),[initialized,setInitialized]=useState<boolean|null>(viewerCache?.initialized??null),[loading,setLoading]=useState(!viewerCache),[error,setError]=useState('');useEffect(()=>{let active=true;loadViewer().then(d=>{if(active){setUser(d.user);setInitialized(d.initialized)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);return {user,initialized,loading,error};}
export function readCart(){try{return JSON.parse(localStorage.getItem('galeteria-cart')||'[]')}catch{return []}}
export function saveCart(cart:unknown){localStorage.setItem('galeteria-cart',JSON.stringify(cart));}
