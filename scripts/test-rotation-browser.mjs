// Focused reproduction of the previously intermittent quarter-turn timeout.
// Normal password login; never inject a session or change campaign state.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
const { values: o } = parseArgs({ options: { url: {type:'string'}, world:{type:'string'}, credentials:{type:'string'}, out:{type:'string',default:'artifacts/rotation'}, turns:{type:'string',default:'32'} } });
if (!o.url || !o.world || !o.credentials) throw Error('Pass --url, --world and --credentials for an isolated QA world');
const turns = Number(o.turns);
if (!Number.isInteger(turns) || turns < 4 || turns > 128) throw Error('--turns must be 4..128');
const w = JSON.parse(fs.readFileSync(o.world)), c = JSON.parse(fs.readFileSync(o.credentials)).player1;
fs.mkdirSync(o.out,{recursive:true});
const report = {url:o.url,turns:[],errors:[],knownLimitation:'A passing stress run does not establish that the historical intermittent timeout is resolved.'};
const browser = await chromium.launch({channel:'chrome',headless:false});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}}), p = await context.newPage();
  p.on('pageerror',e=>report.errors.push(String(e)));
  await p.addLocatorHandler(p.getByRole('button',{name:'End the tour',exact:true}),async b=>b.click());
  await p.goto(o.url,{timeout:180000});
  await p.locator('input[autocomplete=username]').fill(c.username);
  await p.locator('input[type=password]').fill(c.password);
  await p.locator('form button[type=submit]').click();
  await p.waitForFunction(()=>!document.querySelector('input[type=password]'),{timeout:60000});
  await p.goto(o.url+'/campaigns/'+w.campaignId,{timeout:180000});
  await p.getByRole('button',{name:'Map',exact:true}).first().click();
  await p.getByRole('radio',{name:'Isometric',exact:true}).click();
  let f;
  await p.waitForFunction(()=>Boolean(document.querySelector('iframe[src*="isometric-tabletop"]')),{timeout:60000});
  const until=Date.now()+120000;
  while(Date.now()<until){f=p.frames().find(f=>f.url().includes('/api/addons/isometric-tabletop/'));if(f&&await f.evaluate(()=>window.odmAddonDiagnostics?.applied>0).catch(()=>false))break;await p.waitForTimeout(200);}
  assert.ok(f && await f.evaluate(()=>window.odmAddonDiagnostics?.applied>0),'Renderer initialized');
  await p.bringToFront();
  const before=await context.request.get(o.url+'/api/campaigns/'+w.campaignId+'/battle-map').then(r=>r.json());
  for(let n=0;n<turns;n++){
    const direction=n<turns/2?1:-1, from=await f.evaluate(()=>window.odmAddonDiagnostics.orientation), to=(from+direction+4)%4, start=Date.now();
    await f.locator(direction===1?'#right':'#left').click();
    await f.waitForFunction(to=>window.odmAddonDiagnostics.orientation===to&&!window.odmAddonDiagnostics.rotating,to,{timeout:15000});
    report.turns.push({from,to,ms:Date.now()-start});
  }
  const after=await context.request.get(o.url+'/api/campaigns/'+w.campaignId+'/battle-map').then(r=>r.json());
  assert.deepEqual(after.view.terrain,before.view.terrain);
  assert.deepEqual(after.view.tokens.map(t=>[t.id,t.x,t.y]),before.view.tokens.map(t=>[t.id,t.x,t.y]));
  assert.deepEqual(report.errors,[]);
  await p.screenshot({path:path.join(o.out,'rotation-stress.png')});
  report.passed=true;
}catch(e){report.error=String(e);process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(o.out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
