import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const odm = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(path.join(odm, 'src/lib/addons/repo-fetch.ts')))
    throw Error('Pass an official ODM checkout');
const root = path.resolve(import.meta.dirname, '..'), commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), folder = 'addon';
register(pathToFileURL(path.join(odm, 'scripts/lib/register-alias.mjs')));
const { fetchAddonFolder } = await import(pathToFileURL(path.join(odm, 'src/lib/addons/repo-fetch.ts')));
const entries = execFileSync('git', ['ls-tree', '-r', '-l', '-z', commit, '--', folder + '/'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).map(line => { const [meta, file] = line.split('\t'), [mode, type, sha, size] = meta.trim().split(/\s+/); assert.equal(type, 'blob'); assert.notEqual(mode, '120000'); return { path: file.slice(folder.length + 1), size: Number(size), sha, executable: mode === '100755' }; });
const reader = { label: 'local committed addon folder ' + commit, list: async () => entries, async *open(relative) { yield execFileSync('git', ['show', commit + ':' + folder + '/' + relative], { cwd: root, maxBuffer: 80 * 1024 * 1024 }); } };
const out = path.join(root, 'artifacts/repository-install-' + Date.now());
const result = await fetchAddonFolder(reader, out);
assert.ok(result.ok, JSON.stringify(result));
for (const e of entries) {
    const downloaded = fs.readFileSync(path.join(out, e.path)), source = fs.readFileSync(path.join(root, folder, e.path));
    assert.equal(createHash('sha256').update(downloaded).digest('hex'), createHash('sha256').update(source).digest('hex'), 'Installed bytes differ: ' + e.path);
}
fs.mkdirSync(path.join(root, 'artifacts/release'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/release/repository-fetch.json'), JSON.stringify({ commit, folder, mode: 'Official file-by-file installer with local Git reader; NOT a public catalogue submission', ...result }, null, 2));
console.log(JSON.stringify({ commit, folder, ...result }));
