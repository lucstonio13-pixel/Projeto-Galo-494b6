import Operations from '../view';
export default async function Page({params}:{params:Promise<{section?:string[]}>}){const parts=(await params).section||[];return <Operations section={parts[0]||'pedidos'} orderId={parts[1]}/>}
