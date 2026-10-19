const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = 'http://127.0.0.1:4173/3d-match-prototype/';
const launchArgs = ['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];

(async () => {
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const results = [];
  const pageErrors = [];
  try {
    // Long full-match test at normal simulation speed, including half-time and full-time.
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    page.on('pageerror', error => pageErrors.push('desktop: ' + error.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.BABYLON, undefined, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('hidden'), undefined, { timeout: 30000 });
    assert.ok(await page.locator('#gameCanvas').isVisible(), 'canvas visible');
    await page.locator('#cameraBtn').click();
    assert.match(await page.locator('#cameraBtn').innerText(), /تلویزیونی/, 'camera toggle switches view');
    await page.locator('#cameraBtn').click();
    await page.locator('#speedBtn').click();
    assert.match(await page.locator('#speedBtn').innerText(), /2×/, 'speed control switches to 2x');
    await page.locator('#speedBtn').click();
    assert.match(await page.locator('#speedBtn').innerText(), /۰٫۵×/, 'speed control cycles to half speed');
    await page.locator('#speedBtn').click();
    assert.match(await page.locator('#speedBtn').innerText(), /1×/, 'speed control cycles back to normal');
    await page.locator('#formationSelect').selectOption('352');
    await page.locator('#strategySelect').selectOption('attack');
    assert.match(await page.locator('#tacticsStatus').innerText(), /۳-۵-۲.*هجومی/);
    await page.locator('#startBtn').click();
    await page.waitForFunction(() => document.querySelector('#matchTime')?.innerText === '45:00', undefined, { timeout: 70000 });
    assert.match(await page.locator('#phaseLabel').innerText(), /نیمه اول/);
    assert.match(await page.locator('#eventLog').innerText(), /پایان نیمه اول/);
    results.push('full first half reached 45:00 and paused at half-time');
    await page.locator('#startBtn').click();
    await page.waitForFunction(() => document.querySelector('#matchTime')?.innerText === '90:00', undefined, { timeout: 70000 });
    assert.match(await page.locator('#phaseLabel').innerText(), /پایان مسابقه/);
    assert.match(await page.locator('#eventLog').innerText(), /پایان مسابقه/);
    results.push('second half reached 90:00 and match ended');
    const stats = {
      homeShots: await page.locator('#homeShots').innerText(),
      awayShots: await page.locator('#awayShots').innerText(),
      homePasses: await page.locator('#homePasses').innerText(),
      awayPasses: await page.locator('#awayPasses').innerText(),
      homeTackles: await page.locator('#homeTackles').innerText(),
      awayTackles: await page.locator('#awayTackles').innerText(),
      possession: [await page.locator('#homePossession').innerText(), await page.locator('#awayPossession').innerText()]
    };
    assert.equal(Number(stats.homeShots) >= 0 && Number(stats.awayShots) >= 0, true);
    assert.equal(parseInt(stats.possession[0]) + parseInt(stats.possession[1]), 100, 'possession percentages total 100');
    await page.locator('#startBtn').click();
    assert.equal(await page.locator('#matchTime').innerText(), '00:00', 'start after full time begins a fresh match');
    await page.locator('#resetBtn').click();
    assert.equal(await page.locator('#homeScore').innerText(), '0');
    results.push('stats remained valid and restart/reset restored a clean match');
    await page.close();

    // Deterministic replay test checks both teams scoring and goal overlay.
    const replay = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    replay.on('pageerror', error => pageErrors.push('mobile-replay: ' + error.message));
    await replay.goto(BASE + '?home=HOME&away=AWAY&hg=1&ag=1&goals=1:0,2:1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await replay.waitForFunction(() => !!window.BABYLON, undefined, { timeout: 30000 });
    await replay.waitForFunction(() => document.querySelector('#loading')?.classList.contains('hidden'), undefined, { timeout: 30000 });
    await replay.waitForFunction(() => document.querySelector('#homeScore')?.innerText === '1' && document.querySelector('#awayScore')?.innerText === '1', undefined, { timeout: 15000 });
    assert.match(await replay.locator('#goalBannerScore').innerText(), /HOME.*1.*1.*AWAY/);
    const mobileMetrics = await replay.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth, canvas: !!document.querySelector('#gameCanvas') && document.querySelector('#gameCanvas').getBoundingClientRect().width > 0 }));
    assert.equal(mobileMetrics.canvas, true, 'mobile canvas has nonzero width');
    assert.ok(mobileMetrics.page <= mobileMetrics.viewport + 1, 'mobile layout should not overflow horizontally: ' + JSON.stringify(mobileMetrics));
    results.push('deterministic replay registered one goal for each team; mobile canvas rendered without horizontal overflow');
    await replay.close();

    assert.deepEqual(pageErrors, [], 'no uncaught JavaScript page errors: ' + JSON.stringify(pageErrors));
    console.log(JSON.stringify({ result: 'PASS', test: 'extended browser match test', results, finalStats: stats, mobileMetrics, pageErrors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
