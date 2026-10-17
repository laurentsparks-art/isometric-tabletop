import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

export function recordDemo(dir,expectedUrl,mode){
 const folder=path.join(dir,'diagnostics-'+Date.now());fs.mkdirSync(folder,{recursive:true});
 const data={expectedUrl,mode,started:new Date().toISOString(),events:[],console:[],exceptions:[],failedRequests:[],responses:[],messages:[]};
 const flush=()=>fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(data,null,2));
 const event=(stage,detail={})=>{data.events.push({stage,time:new Date().toISOString(),...detail});flush();console.log('[demo '+stage+']',JSON.stringify(detail));};
 flush();console.log('[demo diagnostics]',folder);return{folder,data,flush,event};
}
export async function attachDemoDiagnostics(context,log){
 const{data,flush}=log;
 context.on('console',m=>{if(['error','warning'].includes(m.type()))data.console.push({type:m.type(),text:m.text().slice(0,2000),location:m.location().url});flush();});
 context.on('weberror',e=>{data.exceptions.push(e.error().message);flush();});
 context.on('requestfailed',r=>{data.failedRequests.push({url:r.url(),error:r.failure()?.errorText});flush();});
 context.on('response',r=>{if(r.url().includes('/isometric/')||r.status()>=400||r.request().resourceType()==='document')data.responses.push({url:r.url(),status:r.status(),type:r.headers()['content-type']});flush();});
 await context.exposeBinding('__demoMessage',(_,m)=>{if(data.messages.length<100)data.messages.push({type:m.type,tags:m.tags,missing:m.missing,cells:m.cells,tokens:m.tokens,revision:m.revision});flush();});
 await context.addInitScript(()=>addEventListener('message',e=>{if(e.data?.protocol==='odm-isometric-v1'&&['ready','applied'].includes(e.data.type))window.__demoMessage(e.data);}));
}
export async function pixelContent(buffer,rect){
 const metadata=await sharp(buffer).metadata();
 const left=Math.max(0,Math.ceil(rect?.x??0)),top=Math.max(0,Math.ceil(rect?.y??0));
 const width=Math.min(Math.floor(rect?.width??metadata.width),metadata.width-left),height=Math.min(Math.floor(rect?.height??metadata.height),metadata.height-top);
 assert.ok(width>100&&height>100,'Canvas display region must have useful dimensions');
 const {data,info}=await sharp(buffer).extract({left,top,width,height}).resize(96,72).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const bins=new Set();let sum=0,sum2=0;
 for(let i=0;i<data.length;i+=info.channels){const r=data[i],g=data[i+1],b=data[i+2];bins.add((r>>4)+','+(g>>4)+','+(b>>4));const v=(r+g+b)/3;sum+=v;sum2+=v*v;}
 const n=info.width*info.height,stddev=Math.sqrt(Math.max(0,sum2/n-(sum/n)**2));
 return{colourBins:bins.size,luminanceStddev:stddev,region:{left,top,width,height},meaningful:bins.size>=20&&stddev>=10};
}
export async function captureDisplay(context,page,log,label,headless){
 const{data,folder,flush}=log;
 const cdp=await context.newCDPSession(page);
 const buffer=Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:headless})).data,'base64');
 await cdp.detach();
 fs.writeFileSync(path.join(folder,label+'.png'),buffer);
 const rect=await page.locator('iframe[title="ODM isometric battle map"]').boundingBox();
 const pixels=await pixelContent(buffer,rect);
 data[label]={source:headless?'offscreen surface ONLY':'display view (fromSurface:false)',...pixels};flush();
 assert.ok(pixels.meaningful,'Uniform/blank '+(headless?'surface':'VISIBLE DISPLAY')+' despite renderer state; see '+folder+'/'+label+'.png');
 return pixels;
}
export async function browserDetails(context,page,log){
 const{data,flush}=log;
 const browser=await context.browser().newBrowserCDPSession();
 data.gpu=await browser.send('SystemInfo.getInfo').catch(e=>({unavailable:e.message}));
 const cdp=await context.newCDPSession(page);
 data.window=await cdp.send('Browser.getWindowForTarget').catch(e=>({unavailable:e.message}));
 data.actualUrl=page.url();
 data.document=await page.evaluate(()=>({readyState:document.readyState,visibility:document.visibilityState,title:document.title,inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],screen:[screen.width,screen.height],dpr:devicePixelRatio,userAgent:navigator.userAgent}));
 flush();await cdp.detach();await browser.detach();
}
export async function verifyDemo(context,page,log,expectedView,{headless=false}={}){
 const{data,event,flush}=log;
 assert.equal(page.url(),data.expectedUrl,'Browser must be on the prepared campaign URL');
 const frame=()=>page.frames().find(f=>f.url().includes('/isometric/index.html'));
 const state=()=>frame()?.evaluate(()=>window.odmIsoDiagnostics);
 const fatalConsole=()=>data.console.filter(m=>m.type==='error'&&!(m.location.endsWith('/voice/channels')&&m.text.includes('403')));
 const wait=async(fn,label)=>{const deadline=Date.now()+45000;while(Date.now()<deadline){if(data.exceptions.length)throw Error(data.exceptions.join('; '));if(fatalConsole().length)throw Error(fatalConsole().map(m=>m.text).join('; '));const broken=data.responses.find(r=>r.url.includes('/isometric/')&&r.status>=400);if(broken)throw Error('Godot asset HTTP '+broken.status+': '+broken.url);if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label);};
 await wait(async()=>{const s=await state();return s?.cells>0&&s.backgroundLoaded&&s.tokens>=3;},'Godot scene populated');
 assert.ok(data.messages.some(m=>m.type==='ready'&&m.missing?.length===0),'Godot ready handshake must be recorded');
 assert.ok(data.messages.some(m=>m.type==='applied'&&m.cells>0),'ODM snapshot applied');
 for(const ext of ['html','js','wasm','pck'])assert.ok(data.responses.some(r=>r.url.endsWith('/index.'+ext)&&[200,304].includes(r.status)),'Loaded Godot '+ext);
 const first=await state();
 assert.equal(first.mapId,expectedView.mapId,'Correct prepared tactical map');
 assert.equal(first.tokens,expectedView.tokens.length,'Authorized projected tokens only');
 assert.ok(expectedView.terrain.includes('#')&&expectedView.terrain.includes('+')&&expectedView.terrain.includes('|'),'Demo contains wall, door and fence terrain');
 const canvas=frame().locator('canvas');await canvas.waitFor({state:'visible'});
 const box=await canvas.boundingBox();assert.ok(box&&box.width>200&&box.height>200,'Visible canvas dimensions');
 data.renderer=await frame().evaluate(()=>({diagnostics:window.odmIsoDiagnostics,canvas:{width:document.querySelector('canvas').width,height:document.querySelector('canvas').height,rect:document.querySelector('canvas').getBoundingClientRect().toJSON()},status:document.getElementById('status')?.textContent}));
 await browserDetails(context,page,log);
 await captureDisplay(context,page,log,'display-before',headless);
 // Real mouse input, not a direct call to a Godot function.
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.wheel(0,-120);
 await wait(async()=> (await state()).camera.zoom!==first.camera.zoom,'wheel zoom reaches Godot');
 const zoom=await state();
 await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2+25,{steps:5});await page.mouse.up({button:'right'});
 await wait(async()=> (await state()).camera.x!==zoom.camera.x,'drag pan reaches Godot');
 await captureDisplay(context,page,log,'display-after-interaction',headless);
 await new Promise(r=>setTimeout(r,2500));
 await captureDisplay(context,page,log,'display-stable',headless);
 assert.equal(page.url(),data.expectedUrl);assert.deepEqual(data.exceptions,[]);
 assert.deepEqual(fatalConsole(),[],'No fatal browser console errors');
 assert.deepEqual(data.failedRequests.filter(r=>r.error!=='net::ERR_ABORTED'),[],'No failed network requests');
 data.knownNonFatal=data.console.filter(m=>m.location.endsWith('/voice/channels')&&m.text.includes('403'));

 data.interaction={pan:true,zoom:true,responsiveAfterDelay:true};flush();
 event('verified',{cells:first.cells,tokens:first.tokens,skin:first.skin,background:first.backgroundLoaded,displayVerified:!headless});
 // Restore initial framing through normal keyboard input for manual review.
 await canvas.click({position:{x:10,y:10}});await page.keyboard.press('0');
}
