// Art-preserving registration: no face projection, palette fill or silhouette replacement.
import sharp from 'sharp';
export async function packAuthoredWall(buffer, {frontTip = null, mode = "", centre = null, radius = null} = {}) {
 if(mode === "source-plane")return registerWater(buffer,{centre,radius});
 if(["registered-approved","registered-art"].includes(mode)){const info=await sharp(buffer).metadata();if(info.width!==128||info.height!==384||!info.hasAlpha)throw Error("Invalid approved registration");return buffer;}
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)throw Error('Empty authored wall');
 let tipX=0,tipCount=0;
 for(let y=Math.max(top,bottom-2);y<=bottom;y++)for(let x=left;x<=right;x++)if(data[(y*info.width+x)*4+3]>40){tipX+=x;tipCount++;}
 const tip=frontTip??[Math.round(tipX/tipCount),bottom];
 const scale=Math.min(64/Math.max(tip[0]-left+1,right-tip[0]+1),280/(bottom-top+1));
 const width=Math.max(1,Math.round((right-left+1)*scale)),height=Math.max(1,Math.round((bottom-top+1)*scale));
 const x=Math.round(64-(tip[0]-left)*scale),y=Math.round(320-(tip[1]-top+1)*scale);
 if(x<0||x+width>128||y<0||y+height>384)throw Error('Authored wall exceeds packed region');
 const sprite=await sharp(buffer).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
 return sharp({create:{width:128,height:384,channels:4,background:'#00000000'}}).composite([{input:sprite,left:x,top:y}]).png().toBuffer();
}

// Register an explicitly inspected interior top plane, rather than an alpha bbox
// that includes a vessel rim, slab bevel or foam. Preserve source RGB exactly.
export async function registerWater(buffer,{centre,radius}) {
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const output=Buffer.alloc(128*384*4);
 for(let y=256;y<320;y++)for(let x=0;x<128;x++){
  if(Math.abs((x+.5-64)/64)+Math.abs((y+.5-288)/32)>1)continue;
  const sx=Math.round(centre[0]+(x+.5-64)*radius/64),sy=Math.round(centre[1]+(y+.5-288)*radius/64);
  if(sx<0||sx>=info.width||sy<0||sy>=info.height||data[(sy*info.width+sx)*4+3]<40)throw Error('Registered water plane crosses transparent source');
  const at=(sy*info.width+sx)*4,to=(y*128+x)*4;data.copy(output,to,at,at+3);output[to+3]=255;
 }
 return sharp(output,{raw:{width:128,height:384,channels:4}}).png().toBuffer();
}
