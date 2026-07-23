import { chromium } from 'playwright';

const URL = process.env.TEST_URL || 'http://localhost:8091/index.html';
const runMs = parseInt(process.env.RUN_MS || '20000', 10);

const logs = [];
// --disable-web-security lets the localhost test page POST cross-origin to the
// ingest worker without the CORS headers nginx/caddy would normally inject.
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security', '--disable-site-isolation-trials'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capture ingest network calls
page.on('request', r => {
  const u = r.url();
  if (u.includes('/v1/web/')) logs.push(`REQ  ${r.method()} ${u}`);
});
page.on('response', async r => {
  const u = r.url();
  if (u.includes('/v1/web/')) logs.push(`RESP ${r.status()} ${u}`);
});
page.on('console', m => { if (/openreplay|OpenReplay|ingest/i.test(m.text())) logs.push(`CONSOLE ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });
// Generate DOM activity so tracker records mutations + events
for (let i = 0; i < 8; i++) {
  await page.click('#btn').catch(()=>{});
  await page.evaluate((n) => {
    const o = document.getElementById('out');
    if (o) o.innerHTML += `<div>row ${n} ${Date.now()}</div>`;
    window.scrollTo(0, (n%2)*400);
  }, i);
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(runMs);

console.log(logs.join('\n'));
console.log(`--- captured ${logs.length} ingest events ---`);
await browser.close();
