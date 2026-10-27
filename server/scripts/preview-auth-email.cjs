// Run after npm run build; requires Playwright in the local tooling (no production dependency).
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { passwordResetEmail } = require('../dist/lib/auth-email');

(async () => {
  const out = path.resolve(process.argv[2] || 'email-preview');
  await fs.mkdir(out, { recursive: true });
  const message = passwordResetEmail('DEMONSTRATION-NON-VALIDE-' + 'x'.repeat(72), {
    NODE_ENV: 'production', WEB_APP_URL: 'https://app.villeconnectos.com',
  });
  await fs.writeFile(path.join(out, 'reset-password.html'), message.html);
  await fs.writeFile(path.join(out, 'reset-password.txt'), message.text);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [name, width, images, scheme] of [
      ['desktop', 800, true, 'light'], ['mobile', 320, true, 'light'],
      ['mobile-images-bloquees', 375, false, 'light'], ['mobile-sombre', 375, true, 'dark'],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: scheme });
      if (!images) await page.route('**/*.png', route => route.abort());
      await page.setContent(message.html, { waitUntil: 'networkidle' });
      const button = page.getByRole('link', { name: 'Réinitialiser mon mot de passe', exact: true });
      await assert.doesNotReject(() => button.waitFor({ state: 'visible' }));
      const box = await button.boundingBox();
      assert.ok(box.height >= 44);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const link = new URL(await button.getAttribute('href'));
      assert.equal(link.origin, 'https://app.villeconnectos.com');
      assert.equal(link.pathname, '/reset-password');
      assert.equal(await page.locator('h1').count(), 1);
      if (images) assert.ok(await page.locator('img').evaluate(img => img.complete && img.naturalWidth > 0));
      // Test a real click, intercepted locally: never send the demonstration token to the public app.
      await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
      await page.route('https://app.villeconnectos.com/**', route => route.fulfill({ status: 200, body: 'Local click check' }));
      await Promise.all([page.waitForURL(url => url.pathname === '/reset-password'), button.click()]);
      results.push({ name, width, images, scheme, buttonHeight: box.height, noHorizontalOverflow: true, click: 'intercepted locally' });
      await page.close();
    }
    // WCAG contrast for canonical text/button/footer combinations.
    function luminance(hex) {
      const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    }
    for (const [fg, bg] of [['0A2D5E', 'FFFFFF'], ['FFFFFF', '0047FF'], ['0047FF', 'FFFFFF'], ['AEB6C1', '0B1330']]) {
      const [a, b] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
      assert.ok((a + .05) / (b + .05) >= 4.5);
    }
    await fs.writeFile(path.join(out, 'render-checks.json'), JSON.stringify({ results, contrast: 'AA >= 4.5:1', limitations: 'Chromium only; native Gmail and Outlook receipt not verified' }, null, 2));
    console.log(JSON.stringify({ renderChecks: results.length, contrast: 'passed' }));
  } finally { await browser.close(); }
})().catch(() => { console.error('Email preview check failed'); process.exitCode = 1; });
