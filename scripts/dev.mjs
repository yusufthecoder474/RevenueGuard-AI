import {spawn} from 'node:child_process';
import {localEnv} from './local-env.mjs';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1',...process.argv.slice(2)],{stdio:'inherit',env:localEnv()});
child.on('exit',code=>process.exit(code??1));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
