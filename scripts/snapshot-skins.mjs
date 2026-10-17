import {SKINS} from '../config/skins.ts';
import fs from 'node:fs';
fs.writeFileSync('addon/ui/skins.json',JSON.stringify(SKINS.map(({id,theme,genre,bind})=>({id,theme,genre,bind:{...bind,'^':'generic-ladder'}}))));
