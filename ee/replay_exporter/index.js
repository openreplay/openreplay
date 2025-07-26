#!/usr/bin/env node
import { chromium } from 'playwright';
import { program } from 'commander';
import 'dotenv/config' // DEV only
import { uploadSessionVideo, uploadPageScreenshots } from './uploader.js';
import { notifyKafka } from './kafka.js'
import { captureScreenshots, captureLocation } from './capture.js';
import { checkDir } from './utils.js';

program
  .requiredOption('-s, --session <number>', 'session id')
  .requiredOption('-p, --project <number>', 'project id')
  .option('-i --inactivity <string>', 'should we skip inactivity', 'true')
  .option('-l, --login <string>', 'user login')
  .option('-t, --password <string>', 'user password')
  .option('-j, --jwt <string>', 'JWT token for authentication')
  .option('-c, --clear <boolean>', 'removes timer from view', false)

program.parse(process.argv);
const options = program.opts();
const login = options.login || process.env.LOGIN;
const password = options.password || process.env.PASSWORD;

const outDir = process.env.OUTDIR
checkDir(outDir);

const jwt = options.jwt

if (process.argv.length === 2) {
  console.error('Expected at least one argument!');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const session = options.session;
  const projectId = options.project;
  const noTimer = options.clear;
  const url = `${process.env.BASEURL}/${projectId}/session/${session}?fullview=true${jwt ? `&jwt=${jwt}` : ''}${noTimer ? '' : '&timer=true'}`;
  console.log(">>>>> STARTING", session, url)
  const contextOptions = {
    viewport: { width: parseInt(process.env.WIDTH), height: parseInt(process.env.HEIGHT) },
    deviceScaleFactor: 1,
  };
  if (process.env.MODE === 'video') {
    contextOptions.recordVideo = { dir: outDir, size: { width: parseInt(process.env.WIDTH), height: parseInt(process.env.HEIGHT) } };
  }
  const context = await browser.newContext(contextOptions);
  await context.grantPermissions([], { videoEncoder: { keyint: 30 } });
  const page = await context.newPage();
  page.on('console', msg => {
    console.log(msg)
    if (msg.text().includes('PING:SESSION_ENDED')) {
      console.log("Session ended, closing page");
      setTimeout(() => {
        page.close();
      }, 500);
    }
    captureLocation(page, msg.text())
  });
  const startTs = Date.now();
  if (!jwt) {
    await page.goto(`${process.env.BASEURL}/login`, { waitUntil: 'domcontentloaded' });
    const loginText = "Login to your account"
    await page.waitForSelector(`text=${loginText}`, { timeout: 5000 });
    console.log(">>>>> ON LOGIN")
    await page.locator('[data-test-id=login]').fill(login)
    await page.locator('[data-test-id=password]').fill(password);
    await page.locator('[data-test-id=log-button]').click();
    console.log(">>>>> LOGIN DONE")
    await page.waitForTimeout(2500)
  }
  await page.goto(url, { waitUntil: 'commit' });
  await page.evaluate((speed) => {
    localStorage.setItem("__$player-speed$__", speed);
  }, process.env.SPEED ?? 1);
  await page.evaluate((skip) => {
    localStorage.setItem("__$player-skip$__", skip)
  }, options.inactivity ?? 'true');
  await page.waitForResponse(/\/\d+\/dom\.mobe\?.+$/, { timeout: 60000 })
  const videoTs = Date.now() - startTs;
  console.log(">>> IN", page.url())
  const sessionTimeout = 9999 * 60 * 1000;
  try {
    if (process.env.MODE === 'screenshots') {
      await Promise.race([
        captureScreenshots(page, session, sessionTimeout),
        page.waitForEvent('close', { timeout: sessionTimeout + 1000 }),
        page.waitForTimeout(sessionTimeout)
      ]);
    } else {
      await Promise.race([
        page.waitForEvent('close', { timeout: sessionTimeout + 1000 }),
        page.waitForTimeout(sessionTimeout)
      ]);
    }
  } catch (_) { } finally {
    console.log(session, 'done')
    await context.close();
  }

  // const fullName = `videos/${session}-full.webm`;
  const cutName = `videos/${session}.webm`;

  const video = await page.video()
  if (video) {
    video.saveAs(cutName)
  }
  // await cutHead(fullName, cutName, videoTs/1000)
  await browser.close();

  const fileurl = await uploadSessionVideo(session, projectId)
  await uploadPageScreenshots(projectId);
  await notifyKafka(session, 'success', fileurl, `${Math.round((videoTs/1000)*100)/100}s`);
  process.exit(0);
})().catch(async (err) => {
  console.error(err);
  await notifyKafka(options.session, 'failure', "", 0, err.message);
  process.exit(1);
});
