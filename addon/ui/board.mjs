import {adaptSnapshot,northFrame} from './adapter.mjs';
const skins=await fetch('skins.json',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('Missing skin catalogue');return r.json();});
let latest=null, revision=0, ready=false, orientation=null;
const post = message=>parent.postMessage({odm:1,...message},'*');
const diagnostics=window.odmAddonDiagnostics={ready:false,applied:0,errors:[],snapshots:0,orientation:0};
const send = packet=>window.odmIso.receive?.(JSON.stringify({revision,mapId:latest?.mapId,reducedMotion:latest?.appearance?.reducedMotion===true,...packet}));
const labels=document.getElementById('labels');
function present(m){
 if(m.revision!==revision||m.mapId!==latest?.mapId)return;
 diagnostics.orientation=m.orientation; diagnostics.rotating=m.rotating;diagnostics.anchors=m.anchors;diagnostics.labels=m.labels;
 document.getElementById('north').src='north-'+northFrame(m.north)+'.png';
 labels.replaceChildren();
 if(latest.options?.labels!==false) for(const p of m.labels){const t=latest.tokens.find(t=>t.id===p.id)??(typeof p.text==='string'?{name:p.text,health:null,conditions:[]}:null);if(!t)continue;const label=document.createElement('span');label.className='name';label.textContent=t.name;label.style.left=(100*p.x/m.viewport.x)+'%';label.style.top=(100*p.y/m.viewport.y)+'%';const detail=document.createElement('small');detail.textContent=[t.health,...t.conditions].filter(Boolean).join(' · ');label.append(detail);labels.append(label);}
 const placed=[];
 for(const label of [...labels.children].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)){
  let box=label.getBoundingClientRect(),offset=0;
  for(let i=0;i<6;i++){const hit=placed.find(p=>box.left<p.right+3&&box.right>p.left-3&&box.top<p.bottom+3&&box.bottom>p.top-3);if(!hit)break;offset-=box.bottom-hit.top+3;label.style.marginTop=offset+'px';box=label.getBoundingClientRect();}placed.push(box);
 }
 post({type:'anchors',tokens:m.anchors??{}});
}
window.odmIso={receive:null,send(json){const m=JSON.parse(json);switch(m.type){
 case 'ready':ready=true;diagnostics.ready=true;post({type:'ready'});break;
 case 'applied':diagnostics.applied=m.revision;diagnostics.cells=m.cells;diagnostics.tokens=m.tokens;break;
 case 'presentation':present(m);break;
 case 'token-select':if(m.revision===revision&&latest?.tokens.some(t=>t.id===m.tokenId))post({type:'token',tokenId:m.tokenId});break;
 case 'tile-select':case 'move':if(m.revision===revision&&m.x>=0&&m.y>=0&&m.x<latest.width&&m.y<latest.height)post({type:'tile',x:m.x,y:m.y});break;
 case 'hover':if(latest&&m.x>=0&&m.y>=0&&m.x<latest.width&&m.y<latest.height)post({type:'hover',x:m.x,y:m.y});else post({type:'hover',x:null,y:null});break;
 case 'rotation-input':swish();break;
 }},report(json){window.odmIsoDiagnostics=JSON.parse(json);}};
window.addEventListener('message',e=>{
 if(e.source!==parent||e.data?.odm!==1)return;
 const m=e.data;
 try{
 if(m.type==='snapshot'){
  const view=adaptSnapshot(m.snapshot,skins); latest=m.snapshot;diagnostics.snapshots++;revision++;
  send({type:'snapshot',view});
  const next=Number(latest.options?.orientation??0);
  if(orientation!==next){orientation=next;send({type:'view-state',orientation:next});}
 }else if(['camera','ping','fx'].includes(m.type)){send({type:m.type,...m});}
 }catch(e){diagnostics.errors.push(String(e));post({type:'error',message:String(e)});}
});
// No private parent storage reads: UI sound waits for an explicit host preference.
let audio,last=-Infinity;
function swish(){try{const prefs=latest?.appearance?.audio;if(!prefs||prefs.muted||performance.now()-last<120)return;last=performance.now();audio??=new Audio('rotation-swish.wav');audio.pause();audio.currentTime=0;audio.volume=Math.max(0,Math.min(1,prefs.volume))*.35;void audio.play().catch(()=>{});}catch{}}
function rotate(direction){if(!ready||!latest)return;swish();send({type:'rotate',direction});document.getElementById('canvas').focus();}
document.getElementById('left').addEventListener('click',()=>rotate(-1));
document.getElementById('right').addEventListener('click',()=>rotate(1));
document.getElementById('canvas').addEventListener('pointerleave',()=>post({type:'hover',x:null,y:null}));
window.addEventListener('error',e=>{diagnostics.errors.push(e.message);post({type:'error',message:e.message});});
window.addEventListener('unhandledrejection',e=>{diagnostics.errors.push(String(e.reason));post({type:'error',message:String(e.reason)});});
window.dispatchEvent(new Event('odm-adapter-ready'));
