import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const { values: o } = parseArgs({ options: { url: { type: 'string', default: 'http://127.0.0.1:3014' }, world: { type: 'string' }, credentials: { type: 'string' } } });
if (!o.world || !o.credentials)
    throw Error('Pass isolated QA --world and --credentials');
const base = o.url, creds = JSON.parse(fs.readFileSync(o.credentials)).dm, w = JSON.parse(fs.readFileSync(o.world));
const b = await chromium.launch({ channel: 'chrome', headless: false });
try {
    const c = await b.newContext({ viewport: { width: 1600, height: 1100 } }), p = await c.newPage();
    await p.addLocatorHandler(p.getByRole('button', { name: 'End the tour', exact: true }), async (x) => x.click());
    await p.goto(base);
    await p.locator('input[autocomplete=username]').fill(creds.username);
    await p.locator('input[type=password]').fill(creds.password);
    await p.locator('form button[type=submit]').click();
    await p.waitForFunction(() => !document.querySelector('input[type=password]'));
    const start = await c.request.post(base + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: 'start_encounter', args: { enemies: [{ monster: 'bandit', count: 1 }], summary: 'Release screenshot: the party meets a bandit.' } }, timeout: 120000 });
    assert.equal(start.status(), 200);
    await p.goto(base + '/campaigns/' + w.campaignId);
    await p.getByRole('button', { name: 'Map', exact: true }).first().click();
    await p.getByRole('radio', { name: 'Isometric', exact: true }).click();
    await p.getByRole('button', { name: 'Enlarge battle map', exact: true }).click();
    const dialog = p.getByRole('dialog'), handle = await dialog.locator('iframe').elementHandle(), f = await handle.contentFrame();
    await f.waitForFunction(() => window.odmAddonDiagnostics?.applied > 0, { timeout: 60000 });
    await f.locator('#canvas').focus();
    await p.keyboard.press('0');
    await p.waitForTimeout(600);
    await p.screenshot({ path: 'artifacts/gameplay/showcase-enlarged.png' });
    await dialog.getByRole('button', { name: 'Close the board', exact: true }).click();
    const end = await c.request.post(base + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: 'end_encounter', args: { outcome: 'Release screenshot completed' } }, timeout: 120000 });
    assert.equal(end.status(), 200);
    const scene = await c.request.post(base + '/api/campaigns/' + w.campaignId + '/dm/maps/' + w.library['stone-dungeon'], { data: { do: 'open-scene' }, timeout: 120000 });
    assert.equal(scene.status(), 200);
    console.log('Captured actual enlarged ODM combat view and restored exploration scene');
}
finally {
    await b.close();
}
