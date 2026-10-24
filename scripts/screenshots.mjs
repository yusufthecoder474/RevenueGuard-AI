import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {localEnv} from './local-env.mjs';
const base=process.env.SCREENSHOT_BASE_URL||'http://127.0.0.1:8787';
let server,browser,logs='';const checks=[],errors=[];
async function check(name,fn){await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
try{
 if(!process.env.SCREENSHOT_BASE_URL){server=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8787','--var','ANTHROPIC_API_KEY:','--var','GROQ_API_KEY:','--var','WRITE_SECRET:'],{env:localEnv(),stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);}
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}if(!ready)throw new Error('Local Worker unavailable: '+logs);
 const health=await (await fetch(base+'/api/health')).json();if(health.providers.claude||health.providers.open)throw new Error('This offline screenshot suite requires unconfigured live providers.');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:process.env.CHROMIUM_EXECUTABLE_PATH?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']:[]});
 const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});
 await check('initial dashboard has no invented metrics',async()=>{await expect(page.locator('#revenue')).toHaveText('—');await expect(page.locator('#generate')).toBeDisabled()});
 await page.locator('#demo').click();
 await check('synthetic upload calculates 100 rows',async()=>{await expect(page.locator('#dataset-label')).toContainText('Synthetic');await expect(page.locator('#data-status')).toContainText('100 rows');await expect(page.locator('#generate')).toBeEnabled()});
 await page.locator('#generate').click();
 await check('browser renders verified mock report',async()=>{await expect(page.locator('#verdict')).toHaveText('ACCEPTED');await expect(page.locator('#report-output')).toContainText('Verified offline demonstration');await expect(page.locator('#report-meta')).toContainText('D1 audit recorded')});
 await check('offline labeling is visible',async()=>{await expect(page.locator('#mode-label')).toContainText('no inference')});
 await check('desktop layout does not overflow',async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true));
 mkdirSync('docs/screenshots',{recursive:true});
 await page.screenshot({path:'docs/screenshots/dashboard-desktop.png',fullPage:true});
 await page.locator('#inject').click();
 await check('controlled error visibly rejected with source unchanged',async()=>{await expect(page.locator('#verdict')).toHaveText('REJECTED');await expect(page.locator('#validation-text')).toHaveText('VALUE_MISMATCH');await expect(page.locator('#report-output')).toContainText('deliberately altered')});
 await page.locator('#inspector details').evaluate(n=>n.open=true);
 await page.locator('#inspector').screenshot({path:'docs/screenshots/rejection-inspector.png'});
 await page.locator('#inspector details').evaluate(n=>n.open=false);
 await page.locator('#provider').selectOption('claude');await page.locator('#generate').click();
 await check('unconfigured live provider shows unavailable, without mock fallback',async()=>{await expect(page.locator('#verdict')).toHaveText('PROVIDER_ERROR');await expect(page.locator('#report-output')).toContainText('Provider unavailable');await expect(page.locator('#report-meta')).toContainText('claude')});
 await page.locator('#uci').click();
 await check('real UCI sample runs through the application',async()=>{await expect(page.locator('#dataset-label')).toContainText('historical real sample');await expect(page.locator('#data-status')).toContainText('200 rows')});
 await page.locator('#provider').selectOption('mock');await page.locator('#generate').click();await expect(page.locator('#verdict')).toHaveText('ACCEPTED');
 await page.screenshot({path:'docs/screenshots/uci-real-data.png',fullPage:true});
 await page.locator('#audit-button').click();
 await check('audit viewer displays persisted hashes',async()=>{await expect(page.locator('#audit')).toBeVisible();await expect(page.locator('#audit')).toContainText('fact_hash')});
 await page.locator('#audit-button').click();
 await page.locator('#file').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('bad')});
 await check('invalid upload produces readable validation feedback',async()=>{await expect(page.locator('#error')).toBeVisible()});
 const xss='InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice\n1,A,<img src=x onerror=alert(1)>,1,2026-01-01,1.00';
 await page.locator('#file').setInputFiles({name:'escape-check.csv',mimeType:'text/csv',buffer:Buffer.from(xss)});
 await check('uploaded descriptions render as plain text',async()=>{await expect(page.locator('#products')).toContainText('<img');expect(await page.locator('#products img').count()).toBe(0)});
 await page.setViewportSize({width:390,height:844});await page.locator('#demo').click();await expect(page.locator('#dataset-label')).toContainText('Synthetic');await page.locator('#generate').click();await expect(page.locator('#verdict')).toHaveText('ACCEPTED');
 await check('mobile layout does not overflow horizontally',async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true));
 await page.screenshot({path:'docs/screenshots/dashboard-mobile.png',fullPage:true});
 await check('no uncaught browser exceptions',async()=>expect(errors).toEqual([]));
 writeFileSync('docs/results/browser-checks.json',JSON.stringify({browser:await browser.version(),desktop:{width:1600,height:1100},mobile:{width:390,height:844},source:'Screenshots from the actual local Wrangler application. Synthetic and real UCI samples explicitly labeled. Mock reports are not live LLM inference.',passed:checks.length,checks},null,2)+'\n');
}catch(e){writeFileSync('docs/results/browser-failure.log',logs+'\n'+e.stack);throw e}finally{await browser?.close();server?.kill('SIGTERM')}
