import OrderDetail from './view';
export default async function Page({params}:{params:Promise<{id:string}>}){return <OrderDetail id={(await params).id}/>}
