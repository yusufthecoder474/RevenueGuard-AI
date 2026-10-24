import {z} from 'zod';
import {calculate,hash,InputError,MAX_BYTES,exportFacts} from './facts';
import {validateReport,INSIGHTS} from './guard';
import {adapter,PROMPT_VERSION,ProviderError,type ProviderEnv,type ProviderResult} from './providers';
export interface Env extends ProviderEnv{DB:D1Database;ASSETS:Fetcher;WRITE_SECRET?:string}
const ReportRequest=z.object({csv:z.string(),provider:z.enum(['mock','claude','open']),injectFailure:z.boolean().optional()}).strict();
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function body(req:Request){
 if(Number(req.headers.get('content-length'))>MAX_BYTES*2)throw new InputError('FILE_TOO_LARGE','Request exceeds 2 MiB.');
 if(!req.body)throw new InputError('EMPTY_BODY','Request body required.');const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES*2){await reader.cancel();throw new InputError('FILE_TOO_LARGE','Request exceeds 2 MiB.');}chunks.push(value);}
 const buffer=new Uint8Array(size);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length;}return new TextDecoder().decode(buffer);
}
async function authorize(req:Request,env:Env){
 const url=new URL(req.url);const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'ORIGIN_DENIED'},403);
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(!local&&!env.WRITE_SECRET)return json({error:'ACCESS_NOT_CONFIGURED',message:'Configure WRITE_SECRET before remote API use.'},503);
 if(env.WRITE_SECRET){const supplied=req.headers.get('authorization')??'';if(await hash(supplied)!==await hash(`Bearer ${env.WRITE_SECRET}`))return json({error:'UNAUTHORIZED'},401);}
}
export default {
 async fetch(req:Request,env:Env):Promise<Response>{
  const url=new URL(req.url);
  if(!url.pathname.startsWith('/api/')){
   const res=await env.ASSETS.fetch(req);const headers=new Headers(res.headers);headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");headers.set('x-content-type-options','nosniff');return new Response(res.body,{status:res.status,headers});
  }
  const denied=await authorize(req,env);if(denied)return denied;
  try{
   if(req.method==='GET'&&url.pathname==='/api/health')return json({status:'ok',storage:'D1',providers:{mock:true,claude:!!env.ANTHROPIC_API_KEY,open:!!env.GROQ_API_KEY}});
   if(req.method==='GET'&&url.pathname==='/api/audit')return json((await env.DB.prepare('SELECT * FROM report_runs ORDER BY created_at DESC LIMIT 25').all()).results);
   if(req.method!=='POST')return json({error:'NOT_FOUND'},404);
   if(url.pathname==='/api/facts'||url.pathname==='/api/export'){
    const input=z.object({csv:z.string()}).strict().parse(JSON.parse(await body(req)));const set=calculate(input.csv);
    if(url.pathname.endsWith('/export'))return new Response(exportFacts(set),{headers:{'content-type':'text/csv','content-disposition':'attachment; filename="verified-facts.csv"','cache-control':'no-store'}});
    return json({set,inputHash:await hash(input.csv),factHash:await hash(JSON.stringify(set))});
   }
   if(url.pathname==='/api/reports'){
    const input=ReportRequest.parse(JSON.parse(await body(req)));
    if(input.injectFailure&&input.provider!=='mock')throw new InputError('MOCK_ONLY','Controlled injection is available only with MockAdapter.');
    const started=performance.now();const set=calculate(input.csv);const id=crypto.randomUUID();
    const inputHash=await hash(input.csv),factHash=await hash(JSON.stringify(set));let result:ProviderResult|null=null;let status='PROVIDER_ERROR',reason:string|null=null;let verdict:null|ReturnType<typeof validateReport>=null;
    try{
     result=await adapter(input.provider,env).generateReport(set);
     if(input.injectFailure){const o=result.output as any;o.claims.find((c:any)=>c.fact_id==='sales_total').value='999999999.99';}
     verdict=validateReport(result.output,set);status=verdict.status;reason=verdict.issues.map(i=>i.code).join(',')||null;
    }catch(e){if(!(e instanceof ProviderError))throw e;reason=e.code;}
    const latency=Number((performance.now()-started).toFixed(2));
    const model=result?.model??(input.provider==='claude'?(env.CLAUDE_MODEL||'claude-sonnet-5-5'):(env.OPEN_MODEL||'openai/gpt-oss-120b'));
    try{await env.DB.prepare('INSERT INTO report_runs (id,created_at,input_hash,provider,model,prompt_version,fact_hash,validation_status,failure_reason,latency_ms,token_usage,cost_usd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,new Date().toISOString(),inputHash,input.provider,model,PROMPT_VERSION,factHash,status,reason,latency,result?.tokens?JSON.stringify(result.tokens):null,result?.costUsd??null).run();}
    catch{return json({error:'AUDIT_UNAVAILABLE',message:'Report could not be persisted. No report was accepted.'},503);}
    return json({id,set,inputHash,factHash,promptVersion:PROMPT_VERSION,provider:input.provider,model,isMock:input.provider==='mock',injected:!!input.injectFailure,status,reason,latencyMs:latency,tokens:result?.tokens??null,costUsd:result?.costUsd??null,verdict,candidate:result?.output??null,insights:verdict?.report?.insights.map(k=>INSIGHTS[k])??[]},status==='PROVIDER_ERROR'?503:200);
   }
   return json({error:'NOT_FOUND'},404);
  }catch(e){if(e instanceof InputError)return json({error:e.code,message:e.message},400);if(e instanceof z.ZodError||e instanceof SyntaxError)return json({error:'INVALID_REQUEST',message:'Expected a valid JSON request matching the documented schema.'},400);console.error('Request failed',e instanceof Error?e.name:'unknown');return json({error:'INTERNAL_ERROR'},500);}
 }
};
