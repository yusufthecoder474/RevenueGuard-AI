import {z} from 'zod';
import Decimal from 'decimal.js';
import type {Fact,FactSet} from './facts';
export const ReportSchema=z.object({
 claims:z.array(z.object({fact_id:z.string().min(1).max(80),value:z.string().max(100),unit:z.string().max(20),period:z.string().max(80)}).strict()).min(1).max(20),
 calculations:z.array(z.object({rule:z.literal('share_percent'),numerator:z.string().max(80),denominator:z.string().max(80),value:z.string().max(100),unit:z.literal('%'),period:z.string().max(80)}).strict()).max(3),
 insights:z.array(z.enum(['SALES_SUMMARY','PRODUCT_MIX','RETURNS_SEPARATE','DATA_SCOPE'])).min(1).max(4)
}).strict();
export type Report=z.infer<typeof ReportSchema>;
export type Issue={code:string;path:string;expected?:string;actual?:string};
export type Verdict={status:'ACCEPTED'|'REJECTED';issues:Issue[];report:Report|null};
const numeric=/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
export function validateReport(raw:unknown,set:FactSet):Verdict{
 const issues:Issue[]=[];const schema=ReportSchema.safeParse(raw);
 if(!schema.success)return {status:'REJECTED',issues:schema.error.issues.map(i=>({code:'SCHEMA_INVALID',path:i.path.join('.')})),report:null};
 const report=schema.data;const facts=new Map<string,Fact>();
 for(const f of set.facts){if(facts.has(f.id))issues.push({code:'CONFLICTING_FACTS',path:f.id});facts.set(f.id,f);}
 const seen=new Set<string>();
 const issue=(code:string,path:string,expected?:string,actual?:string)=>issues.push({code,path,expected,actual});
 report.claims.forEach((c,i)=>{
  const path=`claims.${i}`;const f=facts.get(c.fact_id);
  if(!f){issue('MISSING_EVIDENCE',path,undefined,c.fact_id);return;}
  if(seen.has(c.fact_id))issue('CONFLICTING_CLAIMS',path);seen.add(c.fact_id);
  if(c.unit!==f.unit)issue('UNIT_MISMATCH',path,f.unit,c.unit);
  if(c.period!==f.period)issue('PERIOD_MISMATCH',path,f.period,c.period);
  if(f.unit==='date_range'){if(c.value!==f.value)issue('VALUE_MISMATCH',path,f.value,c.value);}
  else if(!numeric.test(c.value)||!new Decimal(c.value).isFinite())issue('NON_FINITE_OR_INVALID_NUMBER',path,f.value,c.value);
  else if(!new Decimal(c.value).eq(f.value))issue('VALUE_MISMATCH',path,f.value,c.value);
 });
 if(!seen.has('sales_total'))issue('MISSING_REQUIRED_FACT','claims','sales_total');
 const calcSeen=new Set<string>();
 report.calculations.forEach((c,i)=>{
  const path=`calculations.${i}`;const n=facts.get(c.numerator),d=facts.get(c.denominator);
  if(!n||!d){issue('MISSING_EVIDENCE',path);return;}
  // Explicit authorization: only a top product's share of gross valid sales.
  if(!set.topProducts.some(p=>p.factId===n.id)||d.id!=='sales_total')issue('UNAUTHORIZED_CALCULATION',path);
  if(calcSeen.has(n.id))issue('CONFLICTING_CLAIMS',path);calcSeen.add(n.id);
  if(n.unit!==d.unit||n.period!==d.period)issue('CONFLICTING_FACTS',path);
  if(c.period!==set.period)issue('PERIOD_MISMATCH',path,set.period,c.period);
  if(new Decimal(d.value).eq(0)){issue('ZERO_DENOMINATOR',path);return;}
  const expected=new Decimal(n.value).div(d.value).mul(100).toDecimalPlaces(2).toFixed(2);
  if(!numeric.test(c.value)||!new Decimal(c.value).isFinite())issue('NON_FINITE_OR_INVALID_NUMBER',path,expected,c.value);
  else if(!new Decimal(c.value).eq(expected))issue('PERCENTAGE_MISMATCH',path,expected,c.value);
 });
 return {status:issues.length?'REJECTED':'ACCEPTED',issues,report:issues.length?null:report};
}
export function mockReport(set:FactSet):Report{return {claims:set.facts.map(f=>({fact_id:f.id,value:f.value,unit:f.unit,period:f.period})),calculations:set.topProducts.length&&new Decimal(set.facts.find(f=>f.id==='sales_total')!.value).gt(0)?[{rule:'share_percent',numerator:set.topProducts[0].factId,denominator:'sales_total',value:new Decimal(set.facts.find(f=>f.id===set.topProducts[0].factId)!.value).div(set.facts.find(f=>f.id==='sales_total')!.value).mul(100).toFixed(2),unit:'%',period:set.period}]:[],insights:['SALES_SUMMARY','PRODUCT_MIX','RETURNS_SEPARATE','DATA_SCOPE']}}
export const INSIGHTS={SALES_SUMMARY:'Sales are calculated from valid positive transaction lines in the selected dataset.',PRODUCT_MIX:'Product rankings reflect sales value within this reporting period.',RETURNS_SEPARATE:'Returns and cancellations are counted separately and are not deducted from gross sales.',DATA_SCOPE:'This report describes the uploaded records; it does not infer business causes or future performance.'};
