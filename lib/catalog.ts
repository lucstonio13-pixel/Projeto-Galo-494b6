export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export type Product = { id: string; name: string; description: string; category: string; price: number; serves: string; available: number; image: string; };
export const demoProducts: Product[] = [
  {id:'galeto',name:'Galeto da casa',description:'Galeto dourado, temperado com ervas e assado devagar. Acompanha farofa da casa.',category:'Galeteria',price:3990,serves:'Serve 1–2 pessoas',available:1,image:'/galeto.jpg'},
  {id:'familia',name:'Galeto em família',description:'Dois galetos, arroz, feijão tropeiro e farofa. Para compartilhar a mesa.',category:'Combos',price:8990,serves:'Serve 3–4 pessoas',available:1,image:'/galeto.jpg'},
  {id:'dupla',name:'Dupla na brasa',description:'Um galeto com arroz, vinagrete e farofa. Almoço completo para dois.',category:'Combos',price:5990,serves:'Serve 2 pessoas',available:1,image:'/galeto.jpg'},
  {id:'arroz',name:'Arroz soltinho',description:'Arroz branco fresquinho para acompanhar seu galeto.',category:'Acompanhamentos',price:1200,serves:'Porção de 400 g',available:1,image:''},
  {id:'farofa',name:'Farofa da casa',description:'Farinha tostada na manteiga com cebola e cheiro-verde.',category:'Acompanhamentos',price:900,serves:'Porção de 200 g',available:1,image:''},
  {id:'refri',name:'Refrigerante',description:'Lata bem gelada. Consulte os sabores disponíveis na retirada.',category:'Bebidas',price:600,serves:'350 ml',available:1,image:''},
];
export const categories = ['Todos','Galeteria','Combos','Acompanhamentos','Bebidas'];
export const statusLabels: Record<string,string> = {received:'Recebido',accepted:'Aceito',preparing:'Em preparo',ready:'Pronto',out:'Saiu para entrega',completed:'Concluído',cancelled:'Cancelado'};
export type CartItem = {id:string; quantity:number; note:string; price:number};
export const financeCategories = {income:['Vendas','Outras entradas'],expense:['Ingredientes','Embalagens','Fornecedores','Entregas','Despesas fixas','Taxas','Reembolsos','Outras saídas']};
