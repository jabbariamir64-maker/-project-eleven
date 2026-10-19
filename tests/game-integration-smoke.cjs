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
    assert.deepEqual(errors, [], 'main game and embedded match have no uncaught page errors');
    console.log(JSON.stringify({ result: 'PASS', checks: ['club onboarding completed','live match navigation works','iframe points to 3D match prototype with club names','Babylon scene loads inside main game','canvas and radar visible','no uncaught page errors'], iframeSrc: src, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
