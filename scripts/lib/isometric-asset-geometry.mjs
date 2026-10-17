import sharp from 'sharp';
export const GEOMETRY={region:[128,384],anchor:[64,288],origin:[0,96],margin:[8,8],separation:[16,16],footprint:[128,64],gutter:8};
export async function components(buffer){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true}),seen=new Uint8Array(info.width*info.height),groups=[];
 for(let i=0;i<seen.length;i++){if(seen[i]||data[i*4+3]<40)continue;const pixels=[],todo=[i];seen[i]=1;let left=info.width,top=info.height,right=0,bottom=0;while(todo.length){const p=todo.pop(),x=p%info.width,y=Math.floor(p/info.width);pixels.push(p);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*info.width+xx;if(xx<0||xx>=info.width||yy<0||yy>=info.height||seen[n]||data[n*4+3]<40)continue;seen[n]=1;todo.push(n);}}groups.push({pixels,left,top,width:right-left+1,height:bottom-top+1});}
 groups.sort((a,b)=>b.pixels.length-a.pixels.length);return{data,info,groups};
}
export async function isolateComponent(buffer,cell=null){
 const {data,info,groups}=await components(buffer);const group=cell?groups.filter(g=>Math.floor((g.left+g.width/2)/(info.width/8))===cell[0]&&Math.floor((g.top+g.height/2)/(info.height/4))===cell[1])[0]:groups[0];if(!group)throw Error('No isolated main sprite at '+JSON.stringify(cell));
 const output=Buffer.alloc(info.width*info.height*4);for(const p of group.pixels)data.copy(output,p*4,p*4,p*4+4);
 const image=await sharp(output,{raw:info}).extract({left:group.left,top:group.top,width:group.width,height:group.height}).png().toBuffer();return{image,box:{left:group.left,top:group.top,width:group.width,height:group.height},removed:groups.filter(g=>g!==group).reduce((n,g)=>n+g.pixels.length,0)};
}
export async function normalizeTerrain(buffer,{role,protectedArt=false}){
 if(protectedArt){const original=await sharp(buffer).ensureAlpha().raw().toBuffer();const connected=await components(buffer);for(const group of connected.groups.slice(1))for(const p of group.pixels)original.fill(0,p*4,p*4+4);const padded=Buffer.alloc(128*384*4);original.copy(padded,128*128*4);return sharp(padded,{raw:{width:128,height:384,channels:4}}).png().toBuffer();}
 const clean=await isolateComponent(buffer);const {data,info}=await sharp(clean.image).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(role!=='floor'){
  const h=Math.round(info.height*128/info.width);if(h>304)throw Error('Sprite too tall for common anchor; explicit source repair required');
  const sprite=await sharp(clean.image).resize(128,h,{kernel:'nearest'}).png().toBuffer();return sharp({create:{width:128,height:384,channels:4,background:'#00000000'}}).composite([{input:sprite,left:0,top:320-h}]).png().toBuffer();
 }
 // Fit the material's top plane to the exact logical diamond, not its bevel,
 // disconnected fragments, vegetation height or overall alpha bounding box.
 let cy=info.height/2,maxSpan=0;for(let y=0;y<info.height;y++){let lo=info.width,hi=-1;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>40){lo=Math.min(lo,x);hi=Math.max(hi,x);}if(hi-lo>maxSpan){maxSpan=hi-lo;cy=y;}}
 const palette=[0,0,0];let count=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>40){for(let c=0;c<3;c++)palette[c]+=data[i+c];count++;}for(let c=0;c<3;c++)palette[c]/=count;
 const reduced=await sharp(clean.image).median(3).raw().toBuffer();const output=Buffer.alloc(128*384*4);
 for(let y=256;y<320;y++)for(let x=0;x<128;x++){
  if(Math.abs((x+0.5-64)/64)+Math.abs((y+0.5-288)/32)>1)continue;
  const sx=Math.max(0,Math.min(info.width-1,Math.round((x+0.5)/128*(info.width-1)))),sy=Math.max(0,Math.min(info.height-1,Math.round(cy+(y+0.5-288)*info.width/128)));
  const at=(sy*info.width+sx)*4,to=(y*128+x)*4;
  for(let c=0;c<3;c++){const value=reduced[at+3]>40?reduced[at+c]:palette[c];output[to+c]=Math.round((palette[c]*0.58+value*0.42)/4)*4;}output[to+3]=255;
 }
 return sharp(output,{raw:{width:128,height:384,channels:4}}).png().toBuffer();
}
