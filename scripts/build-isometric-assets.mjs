// Offline packing only: retained GenAI sources are the originals. No API key.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { GEOMETRY, normalizeTerrain } from './lib/isometric-asset-geometry.mjs';
import {packAuthoredWall,registerWater} from './lib/isometric-art-recovery.mjs';
import {flatSurface,canonicalDoor,alignedFence} from './lib/isometric-grid-repair.mjs';
import { SKINS } from '../config/skins.ts';
const base=path.resolve(import.meta.dirname,'../godot/assets');
const source=JSON.parse(await fs.readFile(path.join(base,'metadata/sources.json'),'utf8'));
const terrainSources=JSON.parse(await fs.readFile(path.join(base,'metadata/terrain-sources.json'),'utf8'));
const recovery=JSON.parse(await fs.readFile(path.join(base,'metadata/art-recovery.json'),'utf8'));
const doorOrientations=JSON.parse(await fs.readFile(path.join(base,'metadata/door-orientations.json'),'utf8'));
const catalogue={version:2,geometry:GEOMETRY,tileSize:[128,64],regionSize:GEOMETRY.region,origin:GEOMETRY.origin,materials:{},skins:{},tokens:{},atlases:{},provenance:[]};
const roles=['floor','wall','water','rough','door','door','lowwall','climb'];
const written=new Map();
async function save(file,buffer){const full=path.join(base,file);await fs.mkdir(path.dirname(full),{recursive:true});await fs.writeFile(full,buffer);return createHash('sha256').update(buffer).digest('hex');}
async function isolated(input,columns,rows,c,r,width,maxHeight,mirror=false){
 const m=await sharp(input).metadata();
 const left=Math.round(c*m.width/columns),top=Math.round(r*m.height/rows);
 const right=Math.round((c+1)*m.width/columns),bottom=Math.round((r+1)*m.height/rows);
 // Only trim alpha, never a colour (dark outlines are part of the sprite).
 const {data,info}=await sharp(input).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>40){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(maxX<0)throw Error('Empty generated slot '+input+':'+c+','+r);
 const w=maxX-minX+1,h=maxY-minY+1;
 const scale=Math.min(width/w,maxHeight/h);
 let image=sharp(data,{raw:info}).extract({left:minX,top:minY,width:w,height:h});
 if(mirror)image=image.flop();
 return image.resize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)),{kernel:'nearest'}).png().toBuffer();
}
// Retained original sheets establish provenance; terrain is built exclusively
// from the editable individual sources below. Token sheets retain their own crop.
for(const spec of source.images){
 const raw=await fs.readFile(path.join(base,'generated',spec.file));const m=await sharp(raw).metadata();
 catalogue.provenance.push({...spec,sha256:createHash('sha256').update(raw).digest('hex'),dimensions:[m.width,m.height],tool:'Codex image_gen',basis:'Original design; no third-party art references',processing:spec.kind==='terrain'?'Recovered single-sprite sources; component isolation; common footprint and anchor; restrained floor detail':'Alpha crop and nearest-neighbour packing'});
}
// Individual editable source PNGs are the build inputs; atlas output is disposable.
const normalizedInputs=new Map();
for(const entry of Object.values(terrainSources.entries))normalizedInputs.set(entry.id+':'+entry.axis,await normalizeTerrain(await fs.readFile(path.join(base,entry.file)),entry));
for(const entry of Object.values(terrainSources.entries)){
 const buffer=await fs.readFile(path.join(base,entry.file));let normalized=normalizedInputs.get(entry.id+':'+entry.axis),edit='unchanged raised source';
 if(recovery.entries[entry.id]){const candidate=recovery.entries[entry.id];normalized=await packAuthoredWall(await fs.readFile(path.join(base,candidate.variants?.[entry.axis]?.file??candidate.file)),candidate);if(candidate.role==='rough'){const floorId=candidate.groundMaterial,floorCandidate=recovery.entries[floorId];const ground=floorCandidate?await packAuthoredWall(await fs.readFile(path.join(base,floorCandidate.file)),floorCandidate):await flatSurface(normalizedInputs.get(floorId+':default'),'floor');normalized=await sharp(ground).composite([{input:normalized}]).png().toBuffer();}edit=candidate.mode==='registered-approved'?'Exact user-approved registered artwork; pixels preserved':'Authored recovery candidate: uniform nearest-neighbour scale and ground registration only';}
 else if(recovery.registeredSurfaces?.[entry.id]){const candidate=recovery.registeredSurfaces[entry.id];normalized=await registerWater(buffer,candidate);edit='Registered original interior liquid plane; uniform nearest samples, no fills or slab bevel';}
 else if(['floor','water','rough'].includes(entry.role)){normalized=await flatSurface(normalized,entry.role);edit='Exact 128x64 coplanar diamond; source texture retained';}
 else if(entry.role==='door'){normalized=await canonicalDoor(normalizedInputs.get(entry.id+':axis-a'),entry.axis,doorOrientations.materials[entry.id].sourceWallAxis,doorOrientations.materials[entry.id].registrationMirror);edit='Explicit authored panel-axis contract; bounded 140px; axis-b is exact mirror';}
 else if(entry.role==='lowwall'){normalized=await alignedFence(normalized,entry.axis);edit='Retained fence artwork; consistent authored axis';}

 const hash=await save(entry.output,normalized);written.set(entry.output,normalized);
 const material=catalogue.materials[entry.id]??={role:entry.role,tag:entry.tag,status:recovery.entries[entry.id]?.artStatus??entry.status,variants:{}};
 if(entry.role==='door')material.orientation={...doorOrientations.materials[entry.id],axisA:'y',axisB:'x'};
 material.variants[entry.axis]={file:entry.output,sha256:hash,origin:{...entry.origin,editableSource:entry.file,sourceSha256:createHash('sha256').update(buffer).digest('hex'),protectedArt:entry.protectedArt,geometryEdit:edit,...(recovery.entries[entry.id]?{artRecovery:recovery.entries[entry.id]}:{})},atlas:'',cell:[]};
}
const placeholderBases={ 'cp-street':['laboratory','#7880bc'],'cp-corp':['laboratory','#8fb8c4'],'cp-yard':['sewer','#789b96'],'sp-foundry':['volcanic-deep','#b29871'],'sp-street':['tavern','#bc9b6f'],'pa-highway':['river-bank','#a39478'],'pa-bunker':['stone-dungeon','#8a9678'],'hr-manor':['tavern','#7e688f'],'hr-flesh':['sunken-crypt','#a36a78'],'my-townhouse':['tavern','#9c8982'],'my-alley':['sewer','#7d859a']};
for(const skin of SKINS){
 const placeholder=placeholderBases[skin.id];
 if(placeholder){
  const motif=SKINS.find(s=>s.id===placeholder[0]);
  for(const [tag,id]of Object.entries(skin.bind)){
   if(catalogue.materials[id])continue;
   const motifEntry=catalogue.materials[motif.bind[tag]];
   for(const [axis,v]of Object.entries(motifEntry.variants)){
    const sprite=await sharp(written.get(v.file)).tint(placeholder[1]).png().toBuffer();
    const file='terrain/'+motifEntry.role+'/'+motifEntry.role+'__'+id+(axis==='default'?'':'__'+axis)+'.png';
    const hash=await save(file,sprite);written.set(file,sprite);
    const entry=catalogue.materials[id]??={role:motifEntry.role,tag,status:'placeholder',variants:{}};
    entry.variants[axis]={file,sha256:hash,origin:{baseMaterial:motif.bind[tag],tint:placeholder[1]},atlas:'',cell:[]};
   }
  }
 }
 const {data:floorPixels}=await sharp(written.get(catalogue.materials[skin.bind['.']].variants.default.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const mean=[0,0,0];let count=0;for(let i=0;i<floorPixels.length;i+=4)if(floorPixels[i+3]>40){for(let c=0;c<3;c++)mean[c]+=floorPixels[i+c];count++;}
 const supportColor='#'+mean.map(c=>Math.round(c/count).toString(16).padStart(2,'0')).join('');
 catalogue.skins[skin.id]={supportColor,name:skin.name,status:placeholder?'placeholder':'original-first-pass',tier:placeholder?3:['ship-deck','frozen','desert','laboratory'].includes(skin.id)?2:1,bind:{...skin.bind,'^':'generic-ladder'},background:'backgrounds/bg__'+skin.id+'.png',theme:skin.theme??'',genre:skin.genre??''};
}
for(const [id,candidate] of Object.entries(recovery.entries))if(catalogue.materials[id]?.tag==='#')catalogue.skins[candidate.skin].wallFloorSupport=true;
// Every region has eight transparent pixels on every side. No extrusion
// across alpha silhouettes: transparent gutters and nearest sampling prevent halos.
// One shared atlas per role. Metadata, rather than magic atlas coordinates,
// is the runtime contract. Stable alphabetical material/variant ordering.
for(const role of [...new Set(roles)]){
 const entries=Object.keys(catalogue.materials).sort().flatMap(id=>Object.keys(catalogue.materials[id].variants).sort().map(axis=>({id,axis,entry:catalogue.materials[id],v:catalogue.materials[id].variants[axis]}))).filter(x=>x.entry.role===role);
 const columns=8,rows=Math.ceil(entries.length/columns),atlas='atlases/terrain__'+role+'.png';
 const inputs=entries.map((x,i)=>{x.v.atlas=atlas;x.v.cell=[i%columns,Math.floor(i/columns)];return{input:written.get(x.v.file),left:(i%columns)*144+8,top:Math.floor(i/columns)*400+8}});
 // Copy straight RGBA rows, avoiding alpha-compositing rounding at sprite edges.
 const atlasPixels=Buffer.alloc(columns*144*rows*400*4);
 for(const input of inputs){const {data,info}=await sharp(input.input).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)data.copy(atlasPixels,((input.top+y)*columns*144+input.left)*4,y*info.width*4,(y+1)*info.width*4);}
 const buffer=await sharp(atlasPixels,{raw:{width:columns*144,height:rows*400,channels:4}}).png().toBuffer();
 const hash=await save(atlas,buffer);catalogue.atlases[atlas]={sha256:hash,columns,rows,region:GEOMETRY.region,margin:GEOMETRY.margin,separation:GEOMETRY.separation};
}
// A skin-specific palette treatment, without changing semantic material bindings
// or the shared sewer fence used by other skins.
const frozen=catalogue.skins.frozen;frozen.atlasOverrides={};for(const tag of ['|','^']){const v=Object.values(catalogue.materials[frozen.bind[tag]].variants)[0],original=catalogue.atlases[v.atlas],atlas=v.atlas.replace('.png','__frozen.png');const buffer=await sharp(path.join(base,v.atlas)).grayscale().linear(.65,100).tint('#a8dbf5').png().toBuffer();const hash=await save(atlas,buffer);catalogue.atlases[atlas]={...original,sha256:hash,derivedFrom:v.atlas,treatment:'Frozen palette; geometry and alpha unchanged'};frozen.atlasOverrides[tag]=atlas;}

// Three-skin approval checkpoint: reuse the runtime's existing per-skin atlas
// override contract, leaving shared temple/reference material pixels unchanged.
for(const [skin,registration]of Object.entries(recovery.surfaces??{})){
 const entry=terrainSources.entries[registration.id+':default'];
 const sprite=await registerWater(await fs.readFile(path.join(base,entry.file)),registration);
 const file='terrain/water/water__'+registration.id+'__recovery-'+skin+'.png';
 const hash=await save(file,sprite),v=catalogue.materials[registration.id].variants.default,atlas=v.atlas.replace('.png','__recovery-'+skin+'.png');
 const {data,info}=await sharp(written.get(v.atlas)??await fs.readFile(path.join(base,v.atlas))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels=await sharp(sprite).ensureAlpha().raw().toBuffer();
 for(let y=0;y<384;y++)pixels.copy(data,((v.cell[1]*400+8+y)*info.width+v.cell[0]*144+8)*4,y*128*4,(y+1)*128*4);
 const buffer=await sharp(data,{raw:info}).png().toBuffer();
 catalogue.atlases[atlas]={...catalogue.atlases[v.atlas],sha256:await save(atlas,buffer),derivedFrom:v.atlas,treatment:'Registered original water top plane; preview skin only'};
 const target=catalogue.skins[skin];target.atlasOverrides??={};target.atlasOverrides['~']=atlas;
 target.surfaceRecovery={file,sha256:hash,source:entry.file,registration,approval:'Pending human review'};
}

for(const spec of source.images.filter(x=>x.kind==='tokens')){
 const input=path.join(base,'generated',spec.file);
 for(let i=0;i<spec.ids.length;i++){
  const id=spec.ids[i],group=spec.group;
  const image=await isolated(input,spec.columns,spec.rows,i%spec.columns,Math.floor(i/spec.columns),76,96);
  const file='tokens/'+(group==='class'?'classes':'enemies')+'/token__'+group+'__'+id+'.png';
  const meta=await sharp(image).metadata();
  const buffer=await sharp({create:{width:80,height:104,channels:4,background:'#00000000'}}).composite([{input:image,left:Math.floor((80-meta.width)/2),top:104-meta.height}]).png().toBuffer();
  const hash=await save(file,buffer);catalogue.tokens[group+'/'+id]={file,sha256:hash,status:'original-first-pass',basis:'Original generic '+id+' design',origin:{source:spec.file,cell:[i%spec.columns,Math.floor(i/spec.columns)]},footpoint:[40,104]};
 }
}
const bgSpec=source.images.find(x=>x.kind==='backgrounds');
const families={ 'stone-dungeon':'cave',cavern:'cave','forest-floor':'woodland',mire:'wetland','river-bank':'wetland','open-ground':'woodland','sunken-crypt':'horror','overgrown-ruin':'woodland','volcanic-deep':'volcanic',temple:'warm',sewer:'wetland',tavern:'warm','ship-deck':'wetland',frozen:'ice',desert:'desert',laboratory:'cave','cp-street':'horror','cp-corp':'ice','cp-yard':'cave','sp-foundry':'volcanic','sp-street':'warm','pa-highway':'desert','pa-bunker':'cave','hr-manor':'horror','hr-flesh':'horror','my-townhouse':'warm','my-alley':'horror'};
const input=path.join(base,'generated',bgSpec.file);const bmeta=await sharp(input).metadata();
for(const skin of SKINS){
 const family=families[skin.id],index=bgSpec.families.indexOf(family);if(index<0)throw Error('Missing background family');
 const left=Math.round((index%2)*bmeta.width/2),top=Math.round(Math.floor(index/2)*bmeta.height/4);
 let image=sharp(input).extract({left,top,width:Math.round(((index%2)+1)*bmeta.width/2)-left,height:Math.round((Math.floor(index/2)+1)*bmeta.height/4)-top}).resize(640,320,{kernel:'nearest'});
 if(placeholderBases[skin.id])image=image.tint(placeholderBases[skin.id][1]);
 const buffer=await image.png().toBuffer();catalogue.skins[skin.id].backgroundFamily=family;catalogue.skins[skin.id].backgroundSha256=await save(catalogue.skins[skin.id].background,buffer);
}
await save('metadata/catalogue.json',Buffer.from(JSON.stringify(catalogue,null,2)+'\n'));
console.log('Packed '+Object.keys(catalogue.materials).length+' terrain materials, '+Object.keys(catalogue.skins).length+' skins, '+Object.keys(catalogue.tokens).length+' tokens.');

