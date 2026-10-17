import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {parseArgs} from 'node:util';import {chromium} from 'playwright-core';
const {values:o}=parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:3012'},credentials:{type:'string'},world:{type:'string'},zip:{type:'string',default:'artifacts/isometric-tabletop-0.1.0.zip'},cleanup:{type:'boolean',default:false}}});
if(!o.credentials||!o.world)throw Error('Pass --credentials and --world for an isolated QA world');
const c=JSON.parse(fs.readFileSync(o.credentials)).dm,w=JSON.parse(fs.readFileSync(o.world)),results=[];
const b=await chromium.launch({channel:'chrome',headless:false});try{
 const ctx=await b.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage();await p.addLocatorHandler(p.getByRole('button',{name:'End the tour',exact:true}),async l=>l.click());await p.goto(o.url,{timeout:180000});await p.locator('input[autocomplete=username]').fill(c.username);await p.locator('input[type=password]').fill(c.password);await p.locator('form button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('input[type=password]'),{timeout:60000});
 const api=o.url+'/api/admin/addons',one=api+'/isometric-tabletop';
 if(o.cleanup){
  let r=await ctx.request.patch(one,{data:{enabled:false},timeout:180000});assert.equal(r.status(),200);let offers=await ctx.request.get(o.url+'/api/addons').then(r=>r.json());assert.ok(!offers.boardViews.some(v=>v.addonId==='isometric-tabletop'));results.push('Disabled addon removes contribution');
  await p.goto(o.url+'/campaigns/'+w.campaignId);await p.getByRole('button',{name:'Map',exact:true}).first().click();await p.waitForTimeout(1500);assert.equal(await p.getByRole('radio',{name:'Isometric',exact:true}).count(),0);results.push('Default 2D board remains available');
  r=await ctx.request.delete(one,{timeout:180000});assert.equal(r.status(),200);const view=await ctx.request.get(o.url+'/api/campaigns/'+w.campaignId+'/battle-map').then(r=>r.json());assert.ok(view.view?.tokens.length);results.push('Uninstall preserves campaign and map');
 }else{
  let r=await ctx.request.post(api,{data:{do:'config',allowFiles:true,registryUrl:'off'},timeout:180000});assert.equal(r.status(),200);
  const zip=fs.readFileSync(o.zip);r=await ctx.request.post(api+'/upload',{headers:{'Content-Type':'application/zip','Content-Length':String(zip.length)},data:zip,timeout:180000});assert.equal(r.status(),200,await r.text());results.push('Real ZIP upload/install');
  r=await ctx.request.patch(one,{data:{enabled:true,accept:[]},timeout:180000});assert.equal(r.status(),200,await r.text());const state=await ctx.request.get(one).then(r=>r.json());assert.equal(state.addon.status,'ready');assert.equal(state.addon.source,'file');results.push('Enabled installed package reaches ready without setup or Godot on server');
  r=await ctx.request.post(one,{data:{do:'test'},timeout:180000});assert.equal(r.status(),200,await r.text());results.push('MCP initialization/tool listing from installed package');
 }
 fs.mkdirSync('artifacts/install',{recursive:true});fs.writeFileSync('artifacts/install/'+(o.cleanup?'uninstall':'install')+'.json',JSON.stringify({url:o.url,checks:results},null,2));console.log(results.join('\n'));
}catch(e){console.error(String(e));process.exitCode=1;}finally{await b.close();}
