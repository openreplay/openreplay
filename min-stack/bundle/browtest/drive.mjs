import { chromium } from 'playwright';

// The self-tracking test page is served by caddy on :8096 (same page you open
// manually in a browser). Driving it via caddy keeps the CORS request-shaping
// identical to a real browser session.
const URL = process.env.TEST_URL || 'http://localhost:8096/';
const runMs = parseInt(process.env.RUN_MS || '20000', 10);

const logs = [];
// Normal browser CORS: the tracker posts cross-origin to the caddy ingest proxy
// (:8095), which returns the Access-Control-Allow-Origin headers. This is the
// real request-shaping path; do NOT use --disable-web-security, which bypasses
// it and mis-shapes visual batches (split value is empty -> 400).
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
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
// Closing the browser stops the tracker's beacons/heartbeats; ender then ends
// the session after its idle timeout, which triggers the storage upload.
await browser.close();
console.log('browser closed - session will end after ender idle timeout (~2.5m)');
