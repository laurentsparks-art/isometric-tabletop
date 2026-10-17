import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const input = path.resolve(process.argv[2] ?? 'artifacts/release-browser'), out = path.resolve('artifacts/release/showcase');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync('docs/images', { recursive: true });
for (const [from, to] of [[path.join(input, 'stone-dungeon-0.png'), 'primary.png'], [path.join(input, 'addon-rotation.png'), 'rotation.png'], ['artifacts/gameplay/showcase-enlarged.png', 'gameplay.png']]) {
    await sharp(from).png({ compressionLevel: 9 }).toFile(path.join(out, to));
    fs.copyFileSync(path.join(out, to), 'docs/images/' + to);
}
const skins = ['stone-dungeon', 'forest-floor', 'pa-bunker', 'hr-manor'], parts = [];
for (let i = 0; i < skins.length; i++) {
    const x = i % 2 * 730, y = Math.floor(i / 2) * 690;
    parts.push({ input: await sharp(path.join(input, skins[i] + '-0.png')).extract({ left: 315, top: 110, width: 730, height: 650 }).png().toBuffer(), left: x, top: y + 40 }, { input: Buffer.from('<svg width="730" height="40"><text x="14" y="28" font-family="Arial" font-size="23" fill="#efce83">' + skins[i] + '</text></svg>'), left: x, top: y });
}
await sharp({ create: { width: 1460, height: 1380, channels: 4, background: '#14101d' } }).composite(parts).png({ compressionLevel: 9 }).toFile(path.join(out, 'environments.png'));
fs.copyFileSync(path.join(out, 'environments.png'), 'docs/images/environments.png');
console.log(out);
