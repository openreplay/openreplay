// node tests/browser/run.mjs [--src=<dir with index.ts>] [--browsers=chromium,firefox,webkit] [--only=a,b] [--json=out.json]
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, firefox, webkit } from "playwright-core";
import { startServer } from "./server.mjs";
import { cases } from "./cases.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const src = path.resolve(arg("src", path.join(here, "../../src")));
const browsers = arg("browsers", "chromium,firefox,webkit").split(",");
const only = arg("only", "")?.split(",").filter(Boolean);
const jsonOut = arg("json", null);

const { outputFiles } = await build({
  entryPoints: [path.join(src, "index.ts")],
  bundle: true,
  format: "iife",
  globalName: "NP",
  target: "es2017",
  write: false,
});
const server = await startServer(outputFiles[0].text);
const engines = { chromium, firefox, webkit };
const selected = cases.filter((c) => !only.length || only.includes(c.id));

/** CPU time of samples with a frame of the bundle on the stack (builtins it calls, like JSON.parse, included). */
function libraryTime(profile) {
  const parent = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  for (const n of profile.nodes) for (const child of n.children || []) parent.set(child, n.id);
  const inLibrary = new Map();
  const check = (id) => {
    if (inLibrary.has(id)) return inLibrary.get(id);
    const own = byId.get(id).callFrame.url.endsWith("/np.js");
    const res = own || (parent.has(id) && check(parent.get(id)));
    inLibrary.set(id, res);
    return res;
  };
  let us = 0;
  profile.samples.forEach((id, i) => {
    if (check(id)) us += profile.timeDeltas[i + 1] ?? 0;
  });
  return Math.round(us / 100) / 10;
}

async function runCase(browser, name, c) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = name === "chromium" && c.bench ? await context.newCDPSession(page) : null;
  try {
    await page.goto(server.origin + (c.page || "/"));
    await page.waitForFunction(() => window.NP && window.h);
    if (cdp) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
      await cdp.send("Profiler.start");
    }
    const result = await Promise.race([
      page.evaluate(c.run),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), c.timeout || 10000)),
    ]);
    if (cdp) result.libraryCpuMs = libraryTime((await cdp.send("Profiler.stop")).profile);
    const verdict = c.expect(result);
    return { pass: verdict === true, detail: verdict === true ? result : verdict, result };
  } catch (e) {
    return { pass: false, detail: String(e.message).split("\n")[0] };
  } finally {
    await context.close();
  }
}

const results = {};
await Promise.all(
  browsers.map(async (name) => {
    const browser = await engines[name].launch();
    for (const c of selected) (results[c.id] ??= {})[name] = await runCase(browser, name, c);
    await browser.close();
  }),
);
server.close();

let failed = 0;
for (const c of selected) {
  const row = browsers.map((b) => `${b}:${results[c.id][b].pass ? "✓" : "✗"}`).join(" ");
  console.log(`${row}  ${c.id} — ${c.title}`);
  for (const b of browsers) {
    const r = results[c.id][b];
    if (!r.pass) failed++;
    if (!r.pass || c.bench) console.log(`    ${b}: ${JSON.stringify(r.detail).slice(0, 300)}`);
  }
}
console.log(`\n${selected.length * browsers.length - failed}/${selected.length * browsers.length} passed (${src})`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
