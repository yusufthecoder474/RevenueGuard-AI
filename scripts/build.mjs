import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['frontend/app.ts'],bundle:true,format:'esm',target:'es2022',outfile:'dist/app.js',minify:true});
for(const f of ['index.html','style.css'])await copyFile(`frontend/${f}`,`dist/${f}`);
for(const f of ['synthetic-demo.csv','uci-demo.csv']){try{await copyFile(`data/${f}`,`dist/${f}`)}catch{}}
try{await copyFile('docs/results/benchmark.json','dist/benchmark.json')}catch{}
