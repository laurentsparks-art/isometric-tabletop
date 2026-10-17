import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';import {register} from 'node:module';import {pathToFileURL} from 'node:url';import {parseArgs} from 'node:util';
const {values:o}=parseArgs({options:{odm:{type:'string'},'data-dir':{type:'string'},port:{type:'string',default:'3011'}}});
if(process.env.NODE_ENV==='production'||!o.odm)throw Error('Developer QA only: pass --odm <framework checkout>');
if(!/^\d+$/.test(o.port)||Number(o.port)<1||Number(o.port)>65535)throw Error('Invalid local port');
const addon=path.resolve(import.meta.dirname,'..'),odm=path.resolve(o.odm);
if(!fs.existsSync(path.join(odm,'src/lib/addons/board-bridge.ts')))throw Error('Not an addon-framework checkout');
const home=o['data-dir']?path.resolve(o['data-dir']):path.join(odm,'data/isometric-addon-qa');fs.mkdirSync(home,{recursive:true});
const marker=path.join(home,'world.json');
if(fs.existsSync(marker)){console.log('Existing QA world preserved. Dot-source '+path.join(home,'environment.ps1'));process.exit(0);}
if(fs.existsSync(path.join(home,'world.sqlite')))throw Error('Refusing unidentified database');
process.chdir(odm);
const hostImport=p=>import(pathToFileURL(path.join(odm,p)).href);
const key=randomBytes(32).toString('hex');process.env.SQLITE_DB_PATH=path.join(home,'world.sqlite');process.env.DB_ENCRYPTION_KEY=key;process.env.ODM_ADDON_DEV_DIRS=path.join(addon,'addon');process.env.ADDONS_DIR=path.join(home,'addons');
register(pathToFileURL(path.join(odm,'scripts/lib/register-alias.mjs')));
const users=await hostImport('src/lib/db/users.ts');const {hashPassword}=await hostImport('src/lib/auth.ts');const cs=await hostImport('src/lib/db/campaigns.ts');const sheets=await hostImport('src/lib/db/sheets.ts');const maps=await hostImport('src/lib/db/battle-maps.ts');const enc=await hostImport('src/lib/db/encounters.ts');
const {heroInput}=await import('../tests/fixtures/hero.mjs');const credentials={};const accounts={};
for(const role of ['dm','player1','player2']){const password=randomBytes(18).toString('base64url');const username='addon_'+role;accounts[role]=users.createUser(username,await hashPassword(password),{isAdmin:role==='dm'});credentials[role]={username,password};}
const c=cs.createCampaign(accounts.dm.id,{title:'[Addon QA] The Isometric Keep',description:'Synthetic addon integration campaign',theme:'fantasy',maxPlayers:6,startingLevel:3,difficulty:'normal',gameSettings:{dmMode:'human',multiCharacter:'all_active'}});
for(const role of ['player1','player2'])cs.joinByInviteCode(accounts[role].id,c.inviteCode);
const heroes=[];for(const [role,name,cls] of [['player1','Aster','fighter'],['player1','Lyra','wizard'],['player2','Bram','cleric']])heroes.push(sheets.createSheet(c.id,accounts[role].id,3,heroInput({name,class:cls,level:3})));
cs.setMemberActiveCharacter(c.id,accounts.player1.id,heroes[0].id);cs.setMemberActiveCharacter(c.id,accounts.player2.id,heroes[2].id);cs.setCampaignStatus(c.id,'active');
const e=enc.createEncounter(c.id,'Explore the keep. The sealed eastern chamber is hidden from the party.','scene');
const w=16,h=12;const terrain=Array.from({length:w*h},(_,i)=>{const x=i%w,y=Math.floor(i/w);return x===0||x===w-1||y===0||y===h-1?'#':'.';});
for(let x=3;x<=10;x++)terrain[5*w+x]='#';terrain[5*w+6]='+';for(let y=2;y<9;y++)terrain[y*w+11]='#';terrain[4*w+11]='+';for(const [x,y,t] of [[4,8,'~'],[5,8,'~'],[7,8,','],[8,8,','],[3,7,'|'],[4,7,'|'],[9,3,'^']])terrain[y*w+x]=t;
const map=maps.createBattleMap({encounterId:e.id,campaignId:c.id,width:w,height:h,terrain:terrain.join(''),ambient:'bright',theme:'interior',lights:[],seed:371,skin:{id:'stone-dungeon',bind:{}}});
heroes.forEach((s,i)=>maps.insertToken({mapId:map.id,campaignId:c.id,kind:'pc',refId:s.id,name:s.name,x:2+i,y:2}));
maps.insertToken({mapId:map.id,campaignId:c.id,kind:'npc',refId:'guard',name:'Guard',x:8,y:3});maps.insertToken({mapId:map.id,campaignId:c.id,kind:'npc',refId:'hidden',name:'Secret Witness',x:13,y:8,hidden:true});maps.insertToken({mapId:map.id,campaignId:c.id,kind:'prop',refId:'crate',name:'Supplies',x:7,y:7,stamp:'crate'});
maps.setBattleMapScene(map.id,{doors:{'11,4':'secret'}});
fs.writeFileSync(path.join(home,'credentials.json'),JSON.stringify(credentials,null,2),{mode:0o600});fs.writeFileSync(path.join(home,'key'),key,{mode:0o600});const {createPreparedMap}=await hostImport('src/lib/db/prepared-maps.ts');
const skins=JSON.parse(fs.readFileSync(path.join(addon,'addon/ui/skins.json'))),library={};
for(const skin of skins){const p=createPreparedMap({campaignId:c.id,name:'[Addon QA] '+skin.id,width:w,height:h,terrain:terrain.join(''),ambient:'bright',theme:'interior',lights:[],seed:371,skin:{id:skin.id,bind:{}},scene:{doors:{'11,4':'secret'},labels:[{x:1,y:1,text:'Northwest',dmOnly:false}]}});library[skin.id]=p.id;}
fs.writeFileSync(marker,JSON.stringify({campaignId:c.id,mapId:map.id,heroes:heroes.map(s=>({id:s.id,name:s.name})),library},null,2));
const env={SQLITE_DB_PATH:path.join(home,'world.sqlite'),DB_ENCRYPTION_KEY:key,ADDONS_DIR:path.join(home,'addons'),ODM_ADDON_DEV_DIRS:path.join(addon,'addon'),APP_PUBLIC_URL:'http://127.0.0.1:'+o.port};
const quote=value=>"'"+value.replaceAll("'","''")+"'";
fs.writeFileSync(path.join(home,'environment.ps1'),Object.entries(env).map(([k,v])=>'$env:'+k+' = '+quote(v)).join('\n')+'\n',{mode:0o600});
const {closeDatabaseForRestore}=await hostImport('src/lib/db/core.ts');closeDatabaseForRestore();console.log('Provisioned isolated addon QA campaign '+c.id+'; credentials: '+path.join(home,'credentials.json')+'; environment: '+path.join(home,'environment.ps1'));
