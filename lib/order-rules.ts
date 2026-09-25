export const transitions: Record<string,string[]>={received:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['out','completed','cancelled'],out:['completed','cancelled'],completed:[],cancelled:[]};
export function canTransition(from:string,to:string,mode:string){return !!transitions[from]?.includes(to)&&!(from==='ready'&&((mode==='pickup'&&to==='out')||(mode==='delivery'&&to==='completed')));}
export const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
