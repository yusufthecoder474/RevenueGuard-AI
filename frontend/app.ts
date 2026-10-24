import type {FactSet,Fact} from '../worker/facts';
import Decimal from 'decimal.js';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let csv='',set:FactSet|null=null,busy=false,accessToken='';
function text(id:string,value:string){$(id).textContent=value}
function el(tag:string,content:string,cls?:string){const node=document.createElement(tag);node.textContent=content;if(cls)node.className=cls;return node}
function money(v:string){const [a,b='00']=v.split('.');return '£'+a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+b}
function value(f:Fact){return f.unit==='GBP'?money(f.value):f.value}
function error(message=''){const box=$('error');box.hidden=!message;box.textContent=message}
async function api(path:string,payload?:unknown){
 const res=await fetch('/api/'+path,{method:payload?'POST':'GET',headers:{...(payload?{'content-type':'application/json'}:{}),...(accessToken?{authorization:'Bearer '+accessToken}:{})},body:payload?JSON.stringify(payload):undefined});
 const data=await res.json() as any;if(!res.ok&&!(data.status==='PROVIDER_ERROR'))throw new Error(data.message||data.error||`Request failed (${res.status})`);return data;
}
function buttons(){for(const id of ['generate','inject','export'])$(id).toggleAttribute('disabled',busy||!set);for(const id of ['demo','uci','file','provider'])$(id).toggleAttribute('disabled',busy);text('generate',busy?'Verifying…':'✧ Generate report');}
function resetReport(){text('verdict','Awaiting report');$('verdict').className='label';text('claim-value','—');text('claim-origin','No claim received');text('validation-text','Ready when you are');text('validation-detail','Schema → evidence → value → unit → period');text('evidence','No report generated.');const out=$('report-output');out.className='report-output';out.replaceChildren(el('span','▤','empty-icon'),el('h3','Data is ready. Generate a verified report.'),el('p','The guard will verify every quantitative claim.'));text('report-meta','No report generated for this dataset.');}
function renderFacts(data:FactSet){
 set=data;const get=(id:string)=>data.facts.find(f=>f.id===id)!;
 text('revenue',value(get('sales_total')));text('orders',get('valid_transaction_count').value);text('returns',get('cancellation_count').value);text('aov',value(get('average_order_value')));
 text('sales-lines',`${data.quality.salesLines} validated sales line items`);text('period',data.period.replace('/',' → '));text('metric-note','✓ Source calculated · GBP');
 text('data-status',`${data.quality.rows} rows · ${data.quality.orders} valid orders · ${data.quality.excluded} excluded`+(data.quality.excluded?' · '+Object.entries(data.quality.reasons).map(([k,v])=>`${k}: ${v}`).join(', '):''));
 text('source-value',value(get('sales_total')));text('fact-ref','sales_total · GBP · '+data.period);
 const products=$('products');products.replaceChildren();data.topProducts.forEach((p,i)=>{const row=el('div','','product');row.append(el('span',String(i+1).padStart(2,'0'),'product-rank'));const info=el('div','','product-data');info.append(el('b',p.name),el('small',p.code+' · '+p.factId));row.append(info,el('strong',value(get(p.factId))));products.append(row);});if(!data.topProducts.length)products.append(el('p','No positive-sale products.','placeholder'));
}
async function load(content:string,label:string){
 if(busy)return;busy=true;buttons();error();
 try{const data=await api('facts',{csv:content});csv=content;renderFacts(data.set);text('dataset-label',label);$('dataset-label').className='label green';resetReport();}catch(e){error((e as Error).message);}finally{busy=false;buttons();}
}
async function demo(name:string,label:string){try{const res=await fetch('/'+name);if(!res.ok)throw new Error('Demo not bundled. See data/README.md for real-data processing.');await load(await res.text(),label);}catch(e){error((e as Error).message)}}
$('demo').onclick=()=>demo('synthetic-demo.csv','Synthetic demo · not real sales');$('uci').onclick=()=>demo('uci-demo.csv','UCI Online Retail · historical real sample');
async function upload(file:File){if(file.size>1048576){error('Maximum CSV size is 1 MiB.');return;}await load(await file.text(),'Uploaded CSV · '+file.name)}
$('file').onchange=()=>{const f=$<HTMLInputElement>('file').files?.[0];if(f)void upload(f)};
const drop=$('dropzone');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging')};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');const f=e.dataTransfer?.files[0];if(f)void upload(f)};
async function generate(injectFailure=false){
 if(!set||busy)return;busy=true;buttons();error();
 try{
  const provider=injectFailure?'mock':$<HTMLSelectElement>('provider').value;
  const r=await api('reports',{csv,provider,injectFailure});renderFacts(r.set);
  text('mode-label',r.isMock?'MockAdapter · no inference':'Live API response');text('verdict',r.status);$('verdict').className='label '+(r.status==='ACCEPTED'?'green':'red');
  text('claim-value',r.candidate?.claims?.find((c:any)=>c.fact_id==='sales_total')?.value??'No claim received');
  text('claim-origin',r.injected?'Controlled injection · deliberately corrupted':r.model);
  text('validation-text',r.status==='ACCEPTED'?'All required checks passed':r.reason||'Report rejected');
  text('validation-detail',r.status==='ACCEPTED'?'Schema, evidence, values, units and periods verified':'Candidate output was not accepted. Source metrics remain authoritative.');
  text('evidence',JSON.stringify({reportId:r.id,inputHash:r.inputHash,factHash:r.factHash,promptVersion:r.promptVersion,issues:r.verdict?.issues,candidate:r.candidate},null,2));
  text('report-meta',`${r.isMock?'Offline mock':r.provider} · ${r.latencyMs} ms · D1 audit recorded`);
  const out=$('report-output');out.replaceChildren();out.className='report-output '+(r.status==='ACCEPTED'?'accepted':'rejected');
  if(r.status==='ACCEPTED'){
   out.append(el('h3',r.isMock?'✓ Verified offline demonstration':'✓ Verified business report'));
   const facts=r.set.facts as Fact[];const f=(id:string)=>facts.find(x=>x.id===id)!;
   out.append(el('p',`Gross valid sales are ${value(f('sales_total'))} across ${f('valid_transaction_count').value} distinct valid orders. Average order value is ${value(f('average_order_value'))}.`));
   if(r.verdict.report.calculations.length){const c=r.verdict.report.calculations[0];const n=f(c.numerator),d=f(c.denominator);const percent=new Decimal(n.value).div(d.value).mul(100).toFixed(2);out.append(el('p',`The leading product accounts for ${percent}% of gross valid sales, calculated from approved facts.`));}
   for(const insight of r.insights)out.append(el('p',insight));
  }else{out.append(el('span','◇','empty-icon'),el('h3',r.status==='PROVIDER_ERROR'?'Provider unavailable':'Claim rejected by the numerical guard'),el('p',r.injected?'A revenue value was deliberately altered for this controlled test. VALUE_MISMATCH was detected.':r.reason||'Unsupported output was rejected.'),el('p','Verified metrics above come from the source data.'))}
 }catch(e){error((e as Error).message)}finally{busy=false;buttons();}
}
$('generate').onclick=()=>generate();$('inject').onclick=()=>generate(true);
$('provider').onchange=()=>text('mode-label',$<HTMLSelectElement>('provider').value==='mock'?'Offline mode':'Live API · credentials required');
$('export').onclick=async()=>{try{const res=await fetch('/api/export',{method:'POST',headers:{'content-type':'application/json',...(accessToken?{authorization:'Bearer '+accessToken}:{})},body:JSON.stringify({csv})});if(!res.ok)throw new Error('Export failed. Check API access.');const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='verified-facts.csv';a.click();URL.revokeObjectURL(url)}catch(e){error((e as Error).message)}};
$('audit-button').onclick=async()=>{try{const rows=await api('audit');const node=$('audit');node.hidden=!node.hidden;node.replaceChildren(el('pre',JSON.stringify(rows,null,2)))}catch(e){error((e as Error).message)}};
$('access').onclick=()=>{const token=window.prompt('Enter the API access token configured by the operator. It is kept only in this tab’s memory.');if(token!==null){accessToken=token;error();}};
async function benchmark(){try{const res=await fetch('/benchmark.json');if(!res.ok)return;const data=await res.json() as any;const tbody=$('benchmark-body');tbody.replaceChildren();for(const [name,v] of Object.entries(data.strategies) as [string,any][]){const row=document.createElement('tr');if(name==='Deterministic fact guard')row.className='highlight';for(const item of [name,v.precision===null?'—':(v.precision*100).toFixed(1)+'%',v.recall===null?'—':(v.recall*100).toFixed(1)+'%',String(v.falseNegatives),String(v.falsePositives)])row.append(el('td',item));tbody.append(row);}}catch{}}
void benchmark();
