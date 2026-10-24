// Integration against the actual local Cloudflare workerd runtime and D1 emulator.
import {spawn} from 'node:child_process';
import {localEnv} from './local-env.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8790',secret='test-only-local-token';
const server=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8790','--var',`WRITE_SECRET:${secret}`,'--var','ANTHROPIC_API_KEY:','--var','GROQ_API_KEY:'],{stdio:['ignore','pipe','pipe'],env:localEnv()});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
const csv=readFileSync('data/synthetic-demo.csv','utf8');const checks=[];
async function test(name,fn){await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
async function api(path,payload,headers={}){return fetch(base+'/api/'+path,{method:payload?'POST':'GET',headers:{authorization:'Bearer '+secret,'content-type':'application/json',...headers},body:payload?JSON.stringify(payload):undefined})}
try{
 let ready=false;for(let i=0;i<100;i++){try{const r=await api('health');if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200));}
 if(!ready)throw new Error('Worker did not start: '+logs);
 await test('health exposes actual configured-provider state',async()=>{const r=await api('health');const d=await r.json();assert.equal(d.providers.mock,true);assert.equal(d.storage,'D1');assert.equal(d.providers.claude,false);assert.equal(d.providers.open,false)});
 await test('API requires configured token',async()=>assert.equal((await fetch(base+'/api/health')).status,401));
 await test('wrong token rejected',async()=>assert.equal((await api('health',undefined,{authorization:'Bearer wrong'})).status,401));
 await test('cross-origin POST rejected',async()=>assert.equal((await api('facts',{csv},{origin:'https://example.com'})).status,403));
 await test('facts calculated in real Worker',async()=>{const r=await api('facts',{csv});const d=await r.json();assert.equal(r.status,200);assert.equal(d.set.quality.rows,100);assert.equal(d.set.quality.excluded,2);assert.equal(d.inputHash.length,64)});
 await test('invalid CSV rejected',async()=>{const r=await api('facts',{csv:'bad'});assert.equal(r.status,400);assert.equal((await r.json()).error,'INVALID_CSV')});
 await test('malformed request JSON rejected',async()=>assert.equal((await fetch(base+'/api/facts',{method:'POST',headers:{authorization:'Bearer '+secret},body:'{'})).status,400));
 await test('large CSV rejected with explicit code',async()=>{const r=await api('facts',{csv:'x'.repeat(1048577)});assert.equal(r.status,400);assert.equal((await r.json()).error,'FILE_TOO_LARGE')});
 await test('request body hard limit enforced',async()=>{const r=await api('facts',{csv:'x'.repeat(2097153)});assert.equal(r.status,400)});
 let accepted;
 await test('mock report accepted and truthfully labeled',async()=>{const r=await api('reports',{csv,provider:'mock'});accepted=await r.json();assert.equal(r.status,200);assert.equal(accepted.status,'ACCEPTED');assert.equal(accepted.isMock,true);assert.equal(accepted.tokens,null);assert.equal(accepted.costUsd,null)});
 await test('injected incorrect amount rejected without modifying source facts',async()=>{const r=await api('reports',{csv,provider:'mock',injectFailure:true});const d=await r.json();assert.equal(d.status,'REJECTED');assert.equal(d.reason,'VALUE_MISMATCH');assert.equal(d.set.facts[0].value,accepted.set.facts[0].value);assert.equal(d.candidate.claims[0].value,'999999999.99');assert.equal(d.verdict.report,null)});
 for(const provider of ['claude','open'])await test(`${provider} unavailable without credentials (never silently mock)`,async()=>{const r=await api('reports',{csv,provider});const d=await r.json();assert.equal(r.status,503);assert.equal(d.status,'PROVIDER_ERROR');assert.equal(d.reason,'PROVIDER_UNAVAILABLE');assert.equal(d.isMock,false)});
 await test('forbids live-provider error injection',async()=>assert.equal((await api('reports',{csv,provider:'claude',injectFailure:true})).status,400));
 await test('rejects unknown providers',async()=>assert.equal((await api('reports',{csv,provider:'made-up'})).status,400));
 await test('rejects client supplied facts',async()=>assert.equal((await api('reports',{csv,provider:'mock',facts:[]})).status,400));
 await test('exports verified facts CSV',async()=>{const r=await api('export',{csv});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/csv/);assert.match(await r.text(),/sales_total/)});
 await test('real D1 persists acceptance, rejection and provider failure with provenance',async()=>{const r=await api('audit');const rows=await r.json();const saved=rows.find(x=>x.id===accepted.id);assert.ok(saved);assert.equal(saved.validation_status,'ACCEPTED');assert.equal(saved.input_hash,accepted.inputHash);assert.equal(saved.fact_hash,accepted.factHash);assert.equal(saved.prompt_version,'rg-structured-v1');assert.ok(saved.latency_ms>=0);assert.ok(rows.some(x=>x.validation_status==='REJECTED'&&x.failure_reason==='VALUE_MISMATCH'));assert.ok(rows.some(x=>x.validation_status==='PROVIDER_ERROR'));assert.equal(saved.token_usage,null);assert.equal(saved.cost_usd,null)});
 await test('static frontend served with browser protections',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/RevenueGuard AI/);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/)});
 await test('nonexistent API route returns 404',async()=>assert.equal((await api('unknown')).status,404));
 mkdirSync('docs/results',{recursive:true});writeFileSync('docs/results/worker-integration.json',JSON.stringify({runtime:'Wrangler local / workerd / D1 SQLite emulator',checks,passed:checks.length,cloudDeploymentTested:false},null,2)+'\n');
}catch(e){mkdirSync('docs/results',{recursive:true});writeFileSync('docs/results/worker-integration-failure.log',logs+'\n'+e.stack);throw e;}finally{server.kill('SIGTERM');}
