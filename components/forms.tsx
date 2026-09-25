'use client';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
export function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:(string|{value:string;label:string})[]}){return <label className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="choice" aria-label={label}><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{options.map(o=>{const x=typeof o==='string'?{value:o,label:o}:o;return <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>})}</SelectContent></Select></label>}
export function Confirm({checked,onChange,children}:{checked:boolean;onChange:(v:boolean)=>void;children:React.ReactNode}){return <label className="confirm"><Checkbox checked={checked} onCheckedChange={v=>onChange(v===true)}/><span>{children}</span></label>}
export function ErrorBox({message}:{message:string}){return message?<div className="error-box" role="alert">{message}</div>:null}
