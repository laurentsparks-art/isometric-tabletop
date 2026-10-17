import fs from 'node:fs';import path from 'node:path';import {deflateRawSync,crc32} from 'node:zlib';
const repo=path.resolve(import.meta.dirname,'..'),root=path.join(repo,'addon'),out=path.join(repo,'artifacts');fs.mkdirSync(out,{recursive:true});
const names=[];function list(dir=''){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir?dir+'/'+e.name:e.name;if(e.isDirectory())list(name);else if(e.isFile())names.push(name);else throw Error('Only regular package files are allowed');}}list();
const local=[],central=[];let offset=0;
for(const name of names.sort()){
 const input=fs.readFileSync(path.join(root,name)),data=deflateRawSync(input,{level:6}),n=Buffer.from(name),crc=crc32(input);
 const a=Buffer.alloc(30);a.writeUInt32LE(0x04034b50);a.writeUInt16LE(20,4);a.writeUInt16LE(8,8);a.writeUInt16LE(33,12);a.writeUInt32LE(crc,14);a.writeUInt32LE(data.length,18);a.writeUInt32LE(input.length,22);a.writeUInt16LE(n.length,26);local.push(a,n,data);
 const b=Buffer.alloc(46);b.writeUInt32LE(0x02014b50);b.writeUInt16LE(20,4);b.writeUInt16LE(20,6);b.writeUInt16LE(8,10);b.writeUInt16LE(33,14);b.writeUInt32LE(crc,16);b.writeUInt32LE(data.length,20);b.writeUInt32LE(input.length,24);b.writeUInt16LE(n.length,28);b.writeUInt32LE(offset,42);central.push(b,n);offset+=a.length+n.length+data.length;
}
const c=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(names.length,8);end.writeUInt16LE(names.length,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);const zip=Buffer.concat([...local,c,end]);if(zip.length>64*1024*1024)throw Error('Archive exceeds ODM upload limit');const target=path.join(out,'isometric-tabletop-0.1.0.zip');fs.writeFileSync(target,zip);console.log(target+' ('+zip.length+' bytes, '+names.length+' files)');
