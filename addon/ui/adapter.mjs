// Pure adaptation of the official API v1 snapshot. No requests to ODM APIs.
const classes = new Set('fighter wizard cleric rogue ranger barbarian paladin druid monk bard warlock sorcerer'.split(' '));
const enemies = 'goblin skeleton wolf bandit cultist orc slime giant-spider zombie guard'.split(' ');
export function adaptSnapshot(s, skins) {
 if (s?.bridge !== 1 || !Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width < 1 || s.height < 1 || s.width>512 || s.height>512 || typeof s.terrain !== 'string' || s.terrain.length !== s.width*s.height) throw Error('Invalid board snapshot');
 const explored = new Set(s.fullVision ? Array.from({length:s.width*s.height},(_,i)=>i) : s.explored);
 const terrain = [...s.terrain].map((tag,i)=>explored.has(i)?tag:' ').join('');
 const shown=i=>Number.isInteger(i)&&i>=0&&i<terrain.length&&terrain[i]!==' ';
 const genre=(s.genre??'').toLowerCase().replaceAll('-','_');
 const spec = skins.find(k=>k.id===s.skin?.id) ?? skins.find(k=>genre&&k.genre===genre&&k.theme===s.theme) ?? skins.find(k=>genre&&k.genre===genre) ?? skins.find(k=>!k.genre&&k.theme===s.theme) ?? skins[0];
 const allowed = new Set(Object.keys(spec.bind));
 const bind={...spec.bind};
 for(const [tag,material] of Object.entries(s.skin?.bind??{})) if(allowed.has(tag)&&typeof material==='string')bind[tag]=material;
 return {mapId:s.mapId,width:s.width,height:s.height,terrain,skin:{id:spec.id,bind},explored:[...explored],visible:s.fullVision?[...explored]:s.visible,
 tokens:s.tokens.map(t=>{const c=t.character?.class?.toLowerCase().trim();const words=' '+t.name.toLowerCase().replace(/[^a-z]+/g,' ').trim()+' ';const e=enemies.filter(n=>words.includes(' '+n.replaceAll('-',' ')+' '));return {...t,refId:t.id,footprint:t.size,active:t.id===s.turn?.tokenId,conditions:t.conditions.map(label=>({label,rounds:null})),archetype:t.kind==='pc'&&classes.has(c)?'class/'+c:['enemy','npc'].includes(t.kind)&&e.length===1?'enemy/'+e[0]:''};}),
 reachable:s.reachable.filter(shown),myTokenId:s.myTokenId,selectedSheetId:'',busy:false,round:s.round,board:s.board,turn:s.turn,marks:s.marks,labels:s.labels,lights:s.lights,ambient:s.ambient,intents:s.intents,targets:s.targets,spellZones:s.zones.map(z=>({id:z.id,tone:z.tone,label:z.label,cells:z.cells.filter(shown)}))};
}
export function northFrame(n) { return n.y<0 ? (n.x>0?'ne':'nw') : (n.x>0?'se':'sw'); }
