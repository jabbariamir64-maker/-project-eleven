const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#setup-name', { timeout: 30000 });
    await page.locator('#setup-name').fill('QA Test FC');
    await page.locator('[data-action="setup-next"]').click();
    await page.locator('[data-action="setup-next"]').click();
    await page.locator('[data-action="setup-finish"]').click();
    await page.waitForSelector('#main-nav [data-view="liveMatch"]', { timeout: 30000 });
    await page.locator('#main-nav [data-view="liveMatch"]').click();
    await page.waitForSelector('#view-root iframe', { timeout: 30000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector('#view-root iframe');
      return !!frame?.contentWindow?.BABYLON && frame.contentDocument?.querySelector('#loading')?.classList.contains('hidden');
    }, undefined, { timeout: 60000 });
    const frame = page.locator('#view-root iframe');
    const src = await frame.getAttribute('src');
    assert.match(src, /3d-match-prototype\/index\.html/, 'main game embeds the 3D match prototype');
    assert.match(src, /home=/, 'match frame receives home club name');
    assert.match(src, /away=/, 'match frame receives away club name');
    assert.ok(await page.frameLocator('#view-root iframe').locator('#gameCanvas').isVisible(), '3D canvas is visible inside the main game');
    assert.ok(await page.frameLocator('#view-root iframe').locator('#miniMap').isVisible(), 'tactical mini-map is visible inside the main game');
    assert.match(src, /live=1/, 'next user fixture is opened in live-sync mode');
    const fixtureId = new URL(src, 'http://127.0.0.1:4173/').searchParams.get('fixture');
    const homeId = new URL(src, 'http://127.0.0.1:4173/').searchParams.get('homeId');
    const awayId = new URL(src, 'http://127.0.0.1:4173/').searchParams.get('awayId');
    assert.ok(fixtureId && homeId && awayId, 'live iframe receives fixture and club identifiers');
    const rosterData = await page.frameLocator('#view-root iframe').locator('body').evaluate(() => {
      const p = new URLSearchParams(location.search);
      return {
        home: JSON.parse(p.get('homePlayers') || '[]'),
        away: JSON.parse(p.get('awayPlayers') || '[]'),
        formation: p.get('formation'), strategy: p.get('strategy'), userSide: p.get('userSide'),
        homeColor: p.get('homeColor'), awayColor: p.get('awayColor')
      };
    });
    assert.equal(rosterData.home.length, 11, 'the home starting XI is passed into the 3D engine');
    assert.equal(rosterData.away.length, 11, 'the away starting XI is passed into the 3D engine');
    assert.ok(rosterData.home.every(p => p.id && p.name && Number.isFinite(p.pace)), 'real home player identities and attributes are included');
    assert.ok(rosterData.away.every(p => p.id && p.name && Number.isFinite(p.pace)), 'real away player identities and attributes are included');
    assert.ok(['442', '433', '352'].includes(rosterData.formation), 'saved formation is mapped into the 3D engine');
    assert.ok(['balanced', 'press', 'defensive', 'attack'].includes(rosterData.strategy), 'saved team mentality is mapped into the 3D engine');
    const savedState = await page.evaluate(() => JSON.parse(localStorage.getItem('project-eleven-save-v1')));
    const fixtureBeforeResult = savedState.fixtures.find(m => m.id === fixtureId);
    assert.equal(rosterData.userSide, fixtureBeforeResult.home === savedState.clubId ? '0' : '1', 'the user\'s tactics are assigned to their actual home/away side');
    assert.match(rosterData.homeColor, /^#[0-9a-f]{6}$/i, 'home kit color is passed into the 3D engine');
    assert.match(rosterData.awayColor, /^#[0-9a-f]{6}$/i, 'away kit color is passed into the 3D engine');
    // Exercise the actual engine result sender deterministically. The separate
    // extended test covers real clock progression through both halves.
    await page.locator('#view-root iframe').evaluate(el => {
      const u = new URL(el.src);
      u.searchParams.set('testMode', '1');
      el.src = u.toString();
    });
    await page.waitForFunction(() => {
      const frame = document.querySelector('#view-root iframe');
      return !!frame?.contentWindow?.__P11_TEST_FINISH_MATCH__ &&
        frame.contentDocument?.querySelector('#loading')?.classList.contains('hidden');
    }, undefined, { timeout: 60000 });
    await page.frameLocator('#view-root iframe').locator('body').evaluate(() => {
      if (!window.__P11_TEST_FINISH_MATCH__()) throw new Error('test finish hook did not send the result');
    });
    await page.waitForFunction(({ fixtureId }) => {
      const s = JSON.parse(localStorage.getItem('project-eleven-save-v1') || 'null');
      const m = s?.fixtures?.find(x => x.id === fixtureId);
      return !!m?.played && Number.isInteger(m.homeGoals) && Number.isInteger(m.awayGoals) && s.week === 2;
    }, { fixtureId }, { timeout: 30000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('project-eleven-save-v1')));
    const liveFixture = saved.fixtures.find(x => x.id === fixtureId);
    assert.ok(Number.isFinite(liveFixture.stats.home.shots) && Number.isFinite(liveFixture.stats.away.shots), 'live match stats are persisted');
    assert.equal(liveFixture.events.filter(x => x.type === 'goal').length, liveFixture.homeGoals + liveFixture.awayGoals, 'goal timeline matches the final score');
    assert.ok(saved.fixtures.filter(x => x.round === liveFixture.round).every(x => x.played), 'the full league round is completed exactly once');
    assert.deepEqual(errors, [], 'main game and embedded match have no uncaught page errors');
    console.log(JSON.stringify({ result: 'PASS', checks: ['club onboarding completed','live match navigation works','iframe points to 3D match prototype with club names','Babylon scene loads inside main game','canvas and radar visible','actual starting XIs, player attributes, kits, and tactics are connected','live full-time score and stats persisted','all fixtures in round completed','league week advanced once','no uncaught page errors'], fixtureId, score: [liveFixture.homeGoals, liveFixture.awayGoals], week: saved.week, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
