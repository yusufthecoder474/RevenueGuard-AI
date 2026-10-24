import {controlledCases} from '../tests/fixtures';
import {ReportSchema,validateReport} from '../worker/guard';
import {mkdirSync,writeFileSync} from 'node:fs';
export function benchmark(){
 const cases=controlledCases();const methods:Record<string,(c:typeof cases[number])=>boolean>={
  'No numerical guard':()=>true,
  'Zod schema only':c=>ReportSchema.safeParse(c.report).success,
  'Deterministic fact guard':c=>validateReport(c.report,c.set).status==='ACCEPTED'
 };
 const strategies:Record<string,unknown>={};
 for(const [name,accept] of Object.entries(methods)){
  let tp=0,fp=0,fn=0,tn=0;
  for(const c of cases){const rejected=!accept(c);if(c.invalid){if(rejected)tp++;else fn++;}else{if(rejected)fp++;else tn++;}}
  strategies[name]={truePositives:tp,falsePositives:fp,falseNegatives:fn,trueNegatives:tn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,falseAcceptRate:fn/(tp+fn),falseRejectRate:fp/(fp+tn)};
 }
 return {kind:'controlled_error_injection',positiveClass:'invalid report (rejection is a detection)',cases:cases.length,invalid:cases.filter(c=>c.invalid).length,valid:cases.filter(c=>!c.invalid).length,liveModelOutputs:0,strategies,categories:[...new Set(cases.map(c=>c.category))],limitations:'Fixtures test a constrained schema and authorized formulas, not arbitrary financial reasoning or observed model hallucinations.'};
}
const result=benchmark();mkdirSync('docs/results',{recursive:true});writeFileSync('docs/results/benchmark.json',JSON.stringify(result,null,2)+'\n');writeFileSync('docs/results/controlled-cases.json',JSON.stringify(controlledCases(),null,2)+'\n');console.log(JSON.stringify(result,null,2));
