import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).filter(f => fs.existsSync(f));
const problems = [], seen = new Set(), stats = [];
const hash = b => createHash('sha256').update(b).digest('hex');
for (const f of files) {
    const lower = f.toLowerCase();
    if (seen.has(lower))
        problems.push('Case collision: ' + f);
    seen.add(lower);
    const stat = fs.statSync(f);
    if (!stat.isFile())
        problems.push('Non-file: ' + f);
    if (stat.size >= 100 * 1024 * 1024)
        problems.push('GitHub per-file limit: ' + f);
    if (/(^|\/)(node_modules|\.godot|artifacts|\.env|data)(\/|$)|credentials\.json$|\.sqlite(?:-|$)|\.log$/.test(f))
        problems.push('Private/build file tracked: ' + f);
    if (stat.size < 2 * 1024 * 1024 && !/\.(png|woff2|pck|wasm|wav)$/.test(f)) {
        const s = fs.readFileSync(f, 'utf8');
        if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{50,}|\bsk-proj-[A-Za-z0-9_-]{40,}/.test(s))
            problems.push('Potential secret in ' + f);
    }
    stats.push({ path: f, bytes: stat.size });
}
const manifest = JSON.parse(fs.readFileSync('addon/addon.json')), pkg = JSON.parse(fs.readFileSync('package.json'));
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.apiVersion, 1);
assert.equal(manifest.contributes.boardViews[0].needsViewData, false);
assert.deepEqual(manifest.permissions, []);
const runtime = [];
function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory())
        walk(f);
    else {
        assert.ok(e.isFile());
        const b = fs.readFileSync(f);
        assert.ok(b.length <= 64 * 1024 * 1024);
        runtime.push({ path: path.relative('addon', f).replaceAll('\\', '/'), bytes: b.length, sha256: hash(b) });
    }
} }
walk('addon');
for (const e of runtime.filter(f => /\.(mjs|html|css)$/.test(f.path))) {
    const text = fs.readFileSync(path.join('addon', e.path), 'utf8');
    const refs = [...text.matchAll(/(?:from\s*|fetch\(|(?:src|href)=|url\()['"]?(\.?\.?\/[^'"\s)]+|[A-Za-z0-9_-]+\.(?:json|mjs|css|woff2|png|wav|js))/g)].map(m => m[1]);
    for (const ref of refs) {
        const rel = path.posix.normalize(path.posix.join(path.posix.dirname(e.path), ref));
        if (!runtime.some(f => f.path === rel))
            problems.push('Missing or case-mismatched UI reference ' + e.path + ' -> ' + ref);
    }
}
for (const f of runtime.filter(f => f.path.startsWith('ui/'))) {
    const before = execFileSync('git', ['show', '11dc5e3:' + f.path], { maxBuffer: 70 * 1024 * 1024 });
    assert.equal(hash(before), f.sha256, 'Approved runtime changed: ' + f.path);
}
for (const f of runtime.filter(f => /\.(mjs|css|json|html)$/.test(f.path) && !['ui/index.js'].includes(f.path))) {
    const s = fs.readFileSync(path.join('addon', f.path), 'utf8');
    if (/[A-Za-z]:[\\/](?:Users|WARDEN)\b/.test(s))
        problems.push('Machine path in distributed configuration: ' + f.path);
}
assert.deepEqual(problems, []);
fs.mkdirSync('artifacts/release', { recursive: true });
const result = { version: manifest.version, files: stats.length, sourceBytes: stats.reduce((n, f) => n + f.bytes, 0), runtimeFiles: runtime.length, runtimeBytes: runtime.reduce((n, f) => n + f.bytes, 0), largest: stats.sort((a, b) => b.bytes - a.bytes).slice(0, 5), approvedRuntimeUnchanged: true, problems, runtime };
fs.writeFileSync('artifacts/release/audit.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, runtime: undefined }, null, 2));
