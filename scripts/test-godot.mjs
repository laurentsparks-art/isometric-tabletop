import {godotRun,godotBinary} from './lib/godot-isometric.mjs';
const bin=godotBinary();if(!bin)throw Error('Set GODOT_BIN to Godot 4.7.2');
for(const name of ['test_art','test_ground','test_rotation','test_tabletop']){console.log('Testing '+name);console.log(godotRun(bin,['--script','res://tests/'+name+'.gd']));}
