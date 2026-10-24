import os from 'node:os';
import {fileURLToPath} from 'node:url';
export function localEnv(){
 const env={...process.env,WRANGLER_SEND_METRICS:'false'};
 try{os.networkInterfaces()}catch{env.NODE_OPTIONS=((env.NODE_OPTIONS||'')+' --require='+JSON.stringify(fileURLToPath(new URL('./local-network-compat.cjs',import.meta.url)))).trim();}
 return env;
}
