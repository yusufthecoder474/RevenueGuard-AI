import Papa from 'papaparse';
import Decimal from 'decimal.js';
Decimal.set({precision:50, rounding:Decimal.ROUND_HALF_UP});
export const MAX_BYTES=1_048_576;
export const REQUIRED=['InvoiceNo','StockCode','Description','Quantity','InvoiceDate','UnitPrice'];
export type Fact={id:string;value:string;unit:string;period:string;source:string};
export type FactSet={facts:Fact[];period:string;quality:{rows:number;salesLines:number;orders:number;cancellations:number;excluded:number;reasons:Record<string,number>};topProducts:{factId:string;name:string;code:string}[]};
export class InputError extends Error {constructor(public code:string,message:string){super(message)}}
function fail(code:string,message:string):never{throw new InputError(code,message)}
export function money(v:Decimal.Value){return new Decimal(v).toFixed(2)}
export function dateOnly(s:string){
 if(!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.test(s))return null;
 const d=s.slice(0,10); if(!Number.isFinite(Date.parse(d+'T00:00:00Z'))||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d)return null;
 if(s.length>10){const [h,m,sec='0']=s.slice(11).split(':');if(+h>23||+m>59||+sec>59)return null;}return d;
}
export function calculate(csv:string):FactSet{
 if(new TextEncoder().encode(csv).length>MAX_BYTES)fail('FILE_TOO_LARGE','Maximum CSV size is 1 MiB.');
 const parsed=Papa.parse<Record<string,string>>(csv.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
 if(parsed.errors.length)fail('INVALID_CSV',parsed.errors[0].message);
 const fields=parsed.meta.fields??[];
 if(REQUIRED.some(h=>!fields.includes(h))||new Set(fields).size!==fields.length||Object.keys(parsed.meta.renamedHeaders??{}).length)fail('INVALID_COLUMNS','Expected unique InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice columns.');
 if(fields.some(h=>![...REQUIRED,'CustomerID','Country'].includes(h)))fail('INVALID_COLUMNS','Unknown column. Only the required fields, Country and CustomerID are permitted.');
 if(parsed.data.length===0||parsed.data.length>10000)fail('ROW_LIMIT','Use between 1 and 10,000 data rows.');
 const reasons:Record<string,number>={};let cancellations=0,salesLines=0,excluded=0;let total=new Decimal(0);
 const dates:string[]=[];const orders=new Map<string,string>();const products=new Map<string,{name:string;value:Decimal}>();
 const exclude=(reason:string)=>{excluded++;reasons[reason]=(reasons[reason]??0)+1;};
 for(const [i,r] of parsed.data.entries()){
  const invoice=r.InvoiceNo?.trim(),code=r.StockCode?.trim(),name=r.Description?.trim(),date=dateOnly(r.InvoiceDate?.trim()??'');
  if(!invoice||!code||!name||!date||invoice.length>80||code.length>80||name.length>200)fail('INVALID_ROW',`Row ${i+2}: missing identifiers/description or invalid ISO date.`);
  const q=r.Quantity?.trim()??'';const p=r.UnitPrice?.trim()??'';
  if(!/^-?\d{1,9}$/.test(q)) {exclude('INVALID_QUANTITY');continue;}
  const qty=Number(q);if(qty===0){exclude('ZERO_QUANTITY');continue;}
  // C invoices or negative quantities are return/cancellation lines regardless of price.
  if(/^c/i.test(invoice)||qty<0){cancellations++;dates.push(date);continue;}
  if(!/^\d{1,12}(?:\.\d{1,4})?$/.test(p)||!new Decimal(p).gt(0)){exclude('INVALID_PRICE');continue;}
  if(orders.has(invoice)&&orders.get(invoice)!==date)fail('INCONSISTENT_INVOICE',`Invoice ${invoice} spans dates. Split the dataset into consistent invoices.`);
  orders.set(invoice,date);dates.push(date);salesLines++;
  const line=new Decimal(p).mul(qty);total=total.add(line);
  const prev=products.get(code);if(prev&&prev.name!==name)fail('CONFLICTING_PRODUCT',`Product ${code} has conflicting descriptions.`);
  products.set(code,{name,value:(prev?.value??new Decimal(0)).add(line)});
 }
 if(!dates.length)fail('NO_VALID_ROWS','No valid sales or cancellation rows remain.');
 dates.sort();const period=dates[0]+'/'+dates.at(-1);const facts:Fact[]=[];
 const add=(id:string,value:string,unit:string)=>facts.push({id,value,unit,period,source:'validated CSV transaction records'});
 add('sales_total',money(total),'GBP');add('valid_transaction_count',String(orders.size),'count');add('sales_line_count',String(salesLines),'count');add('cancellation_count',String(cancellations),'count');
 add('average_order_value',orders.size?money(total.div(orders.size)):'0.00','GBP');add('reporting_period',period,'date_range');
 const topProducts=[...products.entries()].sort((a,b)=>b[1].value.cmp(a[1].value)||a[0].localeCompare(b[0])).slice(0,3).map(([code,p],i)=>{const factId=`top_product_${i+1}`;add(factId,money(p.value),'GBP');return {factId,code,name:p.name}});
 return {facts,period,quality:{rows:parsed.data.length,salesLines,orders:orders.size,cancellations,excluded,reasons},topProducts};
}
export async function hash(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function safeCsvCell(v:string){return /^[=+\-@\t\r\n]/.test(v.trimStart())?"'"+v:v}
export function exportFacts(set:FactSet){return Papa.unparse(set.facts.map(f=>Object.fromEntries(Object.entries(f).map(([k,v])=>[k,safeCsvCell(v)]))))}
