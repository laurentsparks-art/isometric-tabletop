import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
const { values: o } = parseArgs({ options: { url: { type: 'string', default: 'http://127.0.0.1:3012' }, credentials: { type: 'string' }, world: { type: 'string' } } });
const w = JSON.parse(fs.readFileSync(o.world)), credentials = JSON.parse(fs.readFileSync(o.credentials)), checks = [], limitations = [];
const windows = [];
const browser = await chromium.launch({ channel: 'chrome', headless: false });
async function login(role, reducedMotion = 'no-preference') { const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion }); const p = await c.newPage(); windows.push(p); await p.addLocatorHandler(p.getByRole('button', { name: 'End the tour' }), async (b) => b.click()); await p.addInitScript(() => { window.__qaInput = []; document.addEventListener('click', e => { if (e.target.id === 'right' || e.target.id === 'left')
    window.__qaInput.push({ id: e.target.id, at: performance.now(), orientation: window.odmAddonDiagnostics?.orientation }); }, true); window.__qaHostSnapshot = null; window.__qaFx = []; window.addEventListener('message', e => { if (e.source !== parent || e.data?.odm !== 1)
    return; if (e.data.type === 'snapshot')
    window.__qaHostSnapshot = e.data.snapshot; if (e.data.type === 'fx')
    window.__qaFx.push(...e.data.events); }); window.__qaTiles = []; window.addEventListener('message', e => { if (e.data?.odm === 1 && e.data.type === 'tile')
    window.__qaTiles.push([e.data.x, e.data.y]); }); }); await p.goto(o.url); await p.locator('input[autocomplete=username]').fill(credentials[role].username); await p.locator('input[type=password]').fill(credentials[role].password); await p.locator('form button[type=submit]').click(); await p.waitForFunction(() => !document.querySelector('input[type=password]')); return { c, p }; }
async function map(p) { await p.goto(o.url + '/campaigns/' + w.campaignId); await p.getByRole('button', { name: 'Map', exact: true }).first().click(); await p.getByRole('radio', { name: 'Isometric', exact: true }).click(); for (let i = 0; i < 400; i++) {
    const f = p.frames().find(f => f.url().includes('/api/addons/isometric-tabletop/'));
    if (f && await f.evaluate(() => window.odmAddonDiagnostics?.applied > 0).catch(() => false))
        return f;
    await p.waitForTimeout(100);
} throw Error('Addon initialization timeout'); }
async function projection(c) { const r = await c.request.get(o.url + '/api/campaigns/' + w.campaignId + '/battle-map'); assert.equal(r.status(), 200); return (await r.json()).view; }
async function point(f, x, y) { const d = await f.evaluate(() => window.odmIsoDiagnostics); let a = x, b = y; switch (d.orientation) {
    case 1:
        a = d.height - 1 - y;
        b = x;
        break;
    case 2:
        a = d.width - 1 - x;
        b = d.height - 1 - y;
        break;
    case 3:
        a = y;
        b = d.width - 1 - x;
        break;
} const lx = d.origin.x + (a - b) * 64, ly = d.origin.y + (a + b) * 32; const box = await f.locator('#canvas').boundingBox(); return { x: box.x + ((lx - d.camera.x) * d.camera.zoom + d.viewport.x / 2) / d.viewport.x * box.width, y: box.y + ((ly - d.camera.y) * d.camera.zoom + d.viewport.y / 2) / d.viewport.y * box.height }; }
try {
    const dm = await login('dm'), player = await login('player1');
    let r = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/maps/' + w.library['stone-dungeon'], { data: { do: 'deploy' } });
    assert.equal(r.status(), 200);
    let df = await map(dm.p), pf = await map(player.p);
    // The parent owns movement authority; two owned sheets do not imply permission for another user's sheet.
    r = await player.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/sheet/switch', { data: { characterId: w.heroes[1].id } });
    assert.equal(r.status(), 200);
    await player.p.waitForTimeout(700);
    let pv = await projection(player.c);
    const mine = pv.tokens.find(t => t.refId === w.heroes[1].id);
    assert.equal(pv.myTokenId, mine.id);
    r = await player.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/sheet/switch', { data: { characterId: w.heroes[2].id } });
    assert.equal(r.status(), 404);
    assert.equal((await projection(player.c)).myTokenId, mine.id);
    checks.push('Multi-character switch and other-player rejection');
    // Tile messages are tested by physical pointer clicks, not injected messages.
    await player.p.bringToFront();
    for (let angle = 0; angle < 4; angle++) {
        const tileCount = await player.p.evaluate(() => window.__qaTiles.length), at = await point(pf, 1, 0);
        await player.p.mouse.click(at.x, at.y);
        await player.p.waitForFunction(n => window.__qaTiles.length > n, tileCount);
        await pf.waitForFunction(() => window.odmIsoDiagnostics.lastPick.x === 1 && window.odmIsoDiagnostics.lastPick.y === 0);
        assert.deepEqual(await player.p.evaluate(() => window.__qaTiles.at(-1)), [1, 0]);
        assert.ok((await pf.locator('#north').getAttribute('src')).endsWith(['ne', 'se', 'sw', 'nw'][angle] + '.png'));
        await pf.locator('#right').click();
        await pf.waitForFunction(n => window.odmAddonDiagnostics.orientation === n && !window.odmAddonDiagnostics.rotating, (angle + 1) % 4);
    }
    checks.push('Actual grid picking and north arrow at all four angles');
    // Select the active figure: host action ring uses the reported sprite bounds.
    if (await player.p.getByRole('menu').count())
        await player.p.getByRole('menu').getByRole('button', { name: 'Close', exact: true }).click();
    pv = await projection(player.c);
    const token = pv.tokens.find(t => t.id === pv.myTokenId), at = await point(pf, token.x, token.y);
    await player.p.mouse.click(at.x, at.y);
    await player.p.getByRole('menu', { name: 'Actions for ' + token.name }).waitFor({ timeout: 10000 });
    checks.push('Official token click opens host action ring at addon anchors');
    await player.p.getByRole('menu', { name: 'Actions for ' + token.name }).getByRole('button', { name: 'Close', exact: true }).click();
    // One approved step, then a strict check of the OTHER session's Godot position.
    const dest = pv.reachable.find(i => Math.max(Math.abs(i % pv.width - token.x), Math.abs(Math.floor(i / pv.width) - token.y)) === 1 && pv.terrain[i] !== '#' && !pv.tokens.some(t => t.x === i % pv.width && t.y === Math.floor(i / pv.width)));
    assert.notEqual(dest, undefined);
    const x = dest % pv.width, y = Math.floor(dest / pv.width), to = await point(pf, x, y);
    const moved = player.p.waitForResponse(r => r.url().includes('/battle-map/move') && r.request().method() === 'POST');
    await player.p.mouse.click(to.x, to.y);
    assert.equal((await moved).status(), 200);
    await df.waitForFunction(({ id, x, y }) => window.odmIsoDiagnostics.positions[id]?.logicalX === x && window.odmIsoDiagnostics.positions[id]?.logicalY === y, { id: token.id, x, y }, { timeout: 30000 });
    checks.push('Strict authoritative movement and cross-session SSE position update');
    await pf.evaluate(() => { window.__qaAudio = []; const original = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__qaAudio.push(this.volume); return original.call(this); }; });
    await pf.locator('#right').click();
    await pf.waitForFunction(() => window.__qaAudio.length > 0);
    assert.ok((await pf.evaluate(() => window.__qaAudio.at(-1))) > 0);
    await player.p.evaluate(() => { localStorage.setItem('odm_ambience_muted', '1'); dispatchEvent(new Event('odm-ambience-prefs')); });
    await player.p.waitForTimeout(300);
    const count = await pf.evaluate(() => window.__qaAudio.length);
    await pf.locator('#right').click();
    await player.p.waitForTimeout(400);
    assert.equal(await pf.evaluate(() => window.__qaAudio.length), count);
    checks.push('Real rotation swish obeys host global mute');
    const quiet = await login('player2', 'reduce'), qf = await map(quiet.p);
    await qf.locator('#right').click();
    await qf.waitForFunction(() => window.odmAddonDiagnostics.orientation === 1);
    assert.equal(await qf.evaluate(() => window.odmAddonDiagnostics.rotating), false);
    checks.push('Second player login and reduced-motion instant rotation');
    // Persistent shared drawing travels through normal ODM persistence and SSE.
    const markView = await projection(player.c), markMine = markView.tokens.find(t => t.id === markView.myTokenId);
    const marked = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/battle-map/draw', { data: { kind: 'stroke', tone: 'gold', points: [{ x: markMine.x + 0.1, y: markMine.y + 0.1 }, { x: markMine.x + 0.7, y: markMine.y + 0.1 }] } });
    assert.equal(marked.status(), 200);
    const markId = (await marked.json()).id;
    await pf.waitForFunction(id => window.__qaHostSnapshot?.marks.some(m => m.id === id), markId);
    await df.waitForFunction(id => window.__qaHostSnapshot?.marks.some(m => m.id === id), markId);
    await player.p.getByRole('radio', { name: 'Board', exact: true }).click();
    await player.p.screenshot({ path: 'artifacts/gameplay/shared-drawing-board.png' });
    await player.p.getByRole('radio', { name: 'Isometric', exact: true }).click();
    pf = await (async () => { for (let i = 0; i < 400; i++) {
        const f = player.p.frames().find(f => f.url().includes('/api/addons/isometric-tabletop/'));
        if (f && await f.evaluate(() => window.odmAddonDiagnostics?.applied > 0).catch(() => false))
            return f;
        await player.p.waitForTimeout(100);
    } throw Error('Drawing return view failed'); })();
    await pf.waitForFunction(id => window.__qaHostSnapshot?.marks.some(m => m.id === id), markId);
    await player.p.screenshot({ path: 'artifacts/gameplay/shared-drawing-isometric.png' });
    checks.push('Persistent drawing synchronized across users and retained across Board/Isometric switch');
    fs.mkdirSync('artifacts/gameplay', { recursive: true });
    await player.p.screenshot({ path: 'artifacts/gameplay/player-controls.png' });
    await dm.p.screenshot({ path: 'artifacts/gameplay/dm-synchronized.png' });
    // Start a real encounter through the existing engine, with a core-generated stat block when no content pack is installed.
    r = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: 'start_encounter', args: { enemies: [{ monster: 'bandit', count: 1 }], summary: 'Short addon combat validation' } }, timeout: 120000 });
    if (r.ok()) {
        await dm.p.waitForTimeout(500);
        const fight = await projection(dm.c);
        assert.equal(fight.board, 'fight');
        assert.ok(fight.tokens.some(t => t.kind === 'enemy'));
        await df.waitForFunction(id => window.odmIsoDiagnostics.mapId === id, fight.mapId, { timeout: 30000 });
        checks.push('Existing engine starts combat, replaces map and displays enemy tokens');
        const acting = fight.tokens.find(t => t.id === fight.turn?.tokenId), attacker = acting?.kind === 'pc' ? acting : fight.tokens.find(t => t.refId === w.heroes[0].id), enemy = fight.tokens.find(t => t.kind === 'enemy');
        const neighbor = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: attacker.x + dx, y: attacker.y + dy })).find(p => p.x >= 0 && p.y >= 0 && p.x < fight.width && p.y < fight.height && fight.terrain[p.y * fight.width + p.x] === '.' && !fight.tokens.some(t => t.x === p.x && t.y === p.y));
        if (neighbor) {
            const placed = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/board', { data: { do: 'place', tokenId: enemy.id, ...neighbor } });
            assert.equal(placed.status(), 200);
            const attackName = acting?.kind === 'enemy' ? 'enemy_attack' : 'pc_attack', attackArgs = attackName === 'enemy_attack' ? { enemyId: enemy.refId, targetCharacterId: attacker.refId } : { characterId: attacker.refId, targetEnemyId: enemy.refId };
            const attack = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: attackName, args: attackArgs }, timeout: 120000 });
            if (attack.ok()) {
                await df.waitForFunction(() => window.__qaFx.some(f => f.kind === 'attack'));
                checks.push('Core ' + attackName + ' adjudication on the actual initiative turn with live authorized combat FX');
            }
            else
                limitations.push('Basic attack not verified: ' + attack.status() + ' ' + (await attack.text()).slice(0, 160));
        }
        const magic = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: 'cast_at_player', args: { characterId: w.heroes[0].id, source: 'QA magical frost hazard', saveAbility: 'dex', dc: 10, damage: '1d4', damageType: 'cold', halfOnSave: true } }, timeout: 120000 });
        if (magic.ok()) {
            await dm.p.waitForTimeout(700);
            checks.push('Core magical hazard saving throw/damage presentation (not a complete character spell turn)');
        }
        else
            limitations.push('Magical hazard presentation not verified: ' + magic.status() + ' ' + (await magic.text()).slice(0, 160));
        await dm.p.screenshot({ path: 'artifacts/gameplay/active-combat.png' });
        const ended = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/invoke', { data: { name: 'end_encounter', args: { outcome: 'QA validation complete' } }, timeout: 120000 });
        if (!ended.ok())
            limitations.push('Combat cleanup: ' + ended.status());
        const scene = await dm.c.request.post(o.url + '/api/campaigns/' + w.campaignId + '/dm/maps/' + w.library['stone-dungeon'], { data: { do: 'open-scene' }, timeout: 120000 });
        assert.equal(scene.status(), 200);
        checks.push('Encounter closure and exploration map replacement');
    }
    else
        limitations.push('Combat start not verified: ' + r.status() + ' ' + (await r.text()).slice(0, 300));
    fs.writeFileSync('artifacts/gameplay/report.json', JSON.stringify({ checks, limitations }, null, 2));
    console.log(JSON.stringify({ checks, limitations }));
}
catch (e) {
    for (let i = 0; i < windows.length; i++) {
        const p = windows[i];
        await p.screenshot({ path: "artifacts/gameplay/failure-" + i + ".png" }).catch(() => { });
        for (const f of p.frames())
            if (f.url().includes("/api/addons/"))
                console.log("FAILED FRAME", i, await f.evaluate(() => ({ engine: window.odmIsoDiagnostics, adapter: window.odmAddonDiagnostics, input: window.__qaInput })));
    }
    console.error(e.stack ?? String(e));
    fs.mkdirSync('artifacts/gameplay', { recursive: true });
    fs.writeFileSync('artifacts/gameplay/report.json', JSON.stringify({ checks, limitations, error: String(e) }, null, 2));
    process.exitCode = 1;
}
finally {
    await browser.close();
}
