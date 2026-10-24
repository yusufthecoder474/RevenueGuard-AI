import {calculate,type FactSet} from '../worker/facts';
import {mockReport} from '../worker/guard';
import Decimal from 'decimal.js';
export const header='InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice\n';
export const sample=header+'10001,A,Mug,3,2026-09-01,0.10\n10001,B,Book,2,2026-09-01,12.35\nC10002,A,Mug,-1,2026-09-02,0.10\n10003,C,Tote,1,2026-09-03,14.005\n';
export type ControlledCase={name:string;category:string;invalid:boolean;set:FactSet;report:unknown};
export function controlledCases():ControlledCase[]{
 const cases:ControlledCase[]=[];
 for(let i=0;i<10;i++){
  const source=header+`S${i},A,Mug,${i+1},2026-09-01,${i%2?'999999999999.9999':'0.335'}\nT${i},B,Book,2,2026-09-02,${i+2}.50\nC${i},A,Mug,-1,2026-09-03,0.335\n`;
  const set=calculate(source);const good=mockReport(set);
  const add=(category:string,invalid:boolean,mutate:(r:any)=>any)=>{const r=structuredClone(good);const changed=mutate(r);cases.push({name:`${category}-${i}`,category,invalid,set,report:changed??r})};
  add('valid_standard',false,()=>{});
  add('valid_subset',false,r=>{r.claims=r.claims.filter((c:any)=>c.fact_id==='sales_total');r.calculations=[]});
  add('valid_equivalent_decimal',false,r=>{r.claims[0].value+='00'});
  add('valid_extreme_or_rounding',false,r=>{r.insights=['DATA_SCOPE'];r.calculations=[]});
  add('altered_revenue',true,r=>{r.claims[0].value=new Decimal(r.claims[0].value).add(i+1).toFixed(2)});
  add('wrong_currency',true,r=>{r.claims[0].unit='USD'});
  add('wrong_period',true,r=>{r.claims[0].period='2025-09-01/2025-09-30'});
  add('incorrect_total',true,r=>{r.claims.find((c:any)=>c.fact_id==='valid_transaction_count').value=String(99+i)});
  add('missing_evidence',true,r=>{r.claims[0].fact_id='unregistered_sales'});
  add('invented_metric',true,r=>{r.claims.push({fact_id:'profit_margin',value:'42',unit:'%',period:set.period})});
  add('malformed_schema',true,r=>{r.claims[0].value=42});
  add('decimal_rounding',true,r=>{r.claims[0].value=new Decimal(r.claims[0].value).add('0.001').toFixed(3)});
  add('unsupported_percentage',true,r=>{r.calculations[0].value='12345.67'});
  add('non_finite',true,r=>{r.claims[0].value=i%2?'NaN':'Infinity'});
  add('free_text_bypass',true,r=>{r.narrative=i%2?'Revenue doubled to fifty thousand pounds.':'Revenue is GBP 50000.'});
  add('conflicting_claim',true,r=>{r.claims.push({...r.claims[0]})});
  add('unauthorized_calculation',true,r=>{r.calculations[0].numerator='average_order_value'});
  add('missing_required_fact',true,r=>{r.claims=r.claims.filter((c:any)=>c.fact_id!=='sales_total')});
 }
 return cases;
}
