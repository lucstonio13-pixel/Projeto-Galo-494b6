import Operations from '../view';
export default async function Page({params}:{params:Promise<{section?:string[]}>}){return <Operations section={(await params).section?.[0]||'pedidos'}/>}
