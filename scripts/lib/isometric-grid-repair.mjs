// Deterministic geometry corrections. Original editable PNGs are never overwritten.
import sharp from 'sharp';
const W=128,H=384;
const diamond=(x,y)=>Math.abs((x+.5-64)/64)+Math.abs((y+.5-288)/32)<=1;
async function pixels(buffer){return sharp(buffer).ensureAlpha().raw().toBuffer();}
function bounds(data){let top=H,bottom=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>40){top=Math.min(top,y);bottom=Math.max(bottom,y);}return{top,bottom};}
function mean(data){const rgb=[0,0,0];let n=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>40){n++;for(let c=0;c<3;c++)rgb[c]+=data[i+c];}return rgb.map(x=>Math.round(x/n));}
const png=data=>sharp(data,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
export async function flatSurface(buffer,role){const data=await pixels(buffer),out=Buffer.alloc(data.length),fallback=mean(data);let cy=288,span=-1;for(let y=180;y<320;y++){let lo=128,hi=-1;for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]>40){lo=Math.min(lo,x);hi=Math.max(hi,x);}if(hi-lo>span){span=hi-lo;cy=y;}}
 for(let y=256;y<320;y++)for(let x=0;x<128;x++)if(diamond(x,y)){const sy=Math.max(0,Math.min(383,cy+y-288)),at=(sy*128+x)*4,to=(y*128+x)*4;for(let c=0;c<3;c++)out[to+c]=data[at+3]>40?data[at+c]:fallback[c];out[to+3]=255;}
 // Keep small rough-ground decoration above its back edge; its ground plane
 // is still exactly the same flat diamond as floor and water, with no bevel.
 if(role==='rough')for(let y=0;y<320;y++)for(let x=0;x<128;x++){if(y>=cy-32+Math.abs(x-63.5)/2)continue;const yy=y+288-cy;if(yy<0||yy>=320||diamond(x,yy))continue;const at=(y*128+x)*4,to=(yy*128+x)*4;if(data[at+3]>40)data.copy(out,to,at,at+4);}
 return png(out);}
export async function panelSlope(buffer){const data=await pixels(buffer),points=[];for(let x=8;x<120;x++){for(let y=0;y<280;y++)if(data[(y*128+x)*4+3]>40){points.push([x,y]);break;}}const mx=points.reduce((a,p)=>a+p[0],0)/points.length,my=points.reduce((a,p)=>a+p[1],0)/points.length;return points.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0)/points.reduce((a,p)=>a+(p[0]-mx)**2,0);}
export async function canonicalDoor(buffer,axis,sourceWallAxis,registrationMirror=false){if(!['x','y'].includes(sourceWallAxis))throw Error('Invalid authored door wall axis');let image=registrationMirror?await sharp(buffer).flop().png().toBuffer():buffer;const data=await pixels(image),b=bounds(data),height=b.bottom-b.top+1,scale=Math.min(1,140/height),width=Math.round(128*scale),h=Math.round(height*scale);const sprite=await sharp(image).extract({left:0,top:b.top,width:128,height}).resize(width,h,{kernel:'nearest'}).png().toBuffer();const output=await sharp({create:{width:128,height:384,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.floor((128-width)/2),top:Math.round(288+width/4)-h}]).png().toBuffer();const flip=(sourceWallAxis==='x')!==registrationMirror;return (axis==='axis-b')!==flip?sharp(output).flop().png().toBuffer():output;}
export async function alignedFence(buffer,axis){const slope=await panelSlope(buffer),needsMirror=(axis==='axis-a'&&slope<0)||(axis==='axis-b'&&slope>0);return needsMirror?sharp(buffer).flop().png().toBuffer():buffer;}
export {diamond};
