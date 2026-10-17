// Optional post-build audit: private runtime state must not be distributable.
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),server=path.join(root,'.next/server');let count=0;const leaks=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.nft.json')){count++;for(const file of JSON.parse(fs.readFileSync(p)).files??[]){const relative=path.relative(root,path.resolve(path.dirname(p),file)).replaceAll('\\','/');if(relative.startsWith('data/')||relative.startsWith('artifacts/'))leaks.push({trace:path.relative(root,p),file:relative});}}}}
if(!fs.existsSync(server))throw Error('Build ODM first');walk(server);if(leaks.length)throw Error('Private state in production trace: '+JSON.stringify(leaks.slice(0,20)));console.log(count+' production traces exclude private data and review artifacts');
