import readline from 'node:readline';
// Board-only addon: no tools, network access or game authority.
for await (const line of readline.createInterface({input:process.stdin})) {
 let q; try {q=JSON.parse(line);} catch {continue;}
 if(q.id===undefined)continue;
 let result;
 if(q.method==='initialize')result={protocolVersion:q.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'isometric-tabletop',version:'0.1.0'}};
 else if(q.method==='tools/list')result={tools:[]};
 else if(q.method==='ping')result={};
 else {process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:q.id,error:{code:-32601,message:'Method not found'}})+'\n');continue;}
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:q.id,result})+'\n');
}
