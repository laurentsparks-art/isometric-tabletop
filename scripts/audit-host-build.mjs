// Run from the ODM checkout after a clean production build.
// Optional arguments name additional private folders (for example external QA data).
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const output = path.join(root, '.next');
const privateDirs = [path.join(root, 'data'), path.join(root, 'artifacts'), ...process.argv.slice(2).map(p => path.resolve(p))];
const inside = (dir, file) => { const r = path.relative(dir, file); return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r)); };
let count = 0;
const leaks = [];
function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'cache' && !e.isSymbolicLink()) walk(file);
        else if (e.isFile() && e.name.endsWith('.nft.json')) {
            count++;
            for (const entry of JSON.parse(fs.readFileSync(file)).files ?? []) {
                const resolved = path.resolve(path.dirname(file), entry);
                const sensitiveName = /(?:\.sqlite(?:-[a-z]+)?|credentials\.json|\.env(?:\..*)?)$/i.test(path.basename(resolved));
                if (sensitiveName || privateDirs.some(dir => inside(dir, resolved))) leaks.push({ trace: path.relative(root, file), file: path.relative(root, resolved) });
            }
        }
    }
}
if (!fs.existsSync(output)) throw Error('Build ODM first');
walk(output);
if (!count) throw Error('No production traces found');
if (leaks.length) throw Error('Private state in production trace: ' + JSON.stringify(leaks.slice(0, 20)));
console.log(count + ' production traces exclude private worlds, environment files and review artifacts');
