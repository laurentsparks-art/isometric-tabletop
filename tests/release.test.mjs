import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)));
test('first public candidate targets the released framework without install-time tooling', () => {
  const m = read('addon/addon.json'), p = read('package.json');
  assert.equal(m.id, 'isometric-tabletop');
  assert.equal(m.version, '0.1.0');
  assert.equal(m.version, p.version);
  assert.equal(m.minServerVersion, '0.28.1');
  assert.equal(m.apiVersion, 1);
  assert.deepEqual(m.platforms, ['win32']);
  assert.deepEqual(m.permissions, []);
  assert.equal(m.runtime.kind, 'node');
  assert.equal(m.setup, undefined);
  assert.equal(m.contributes.boardViews.length, 1);
  assert.equal(m.contributes.boardViews[0].needsViewData, false);
});
