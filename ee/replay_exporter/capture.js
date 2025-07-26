const outDir = process.env.OUTDIR

export async function captureScreenshots(page, sessionId, durationMs) {
  const frameInterval = 1000 / process.env.FPS;
  let frame = 0;
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await page.screenshot({ type: process.env.IMGFORMAT, path: `${outDir}/${sessionId}-${String(frame).padStart(6, '0')}.${process.env.IMGFORMAT}` });
    frame++;
    await page.waitForTimeout(frameInterval);
  }
}

// TRIGGER:LOCATION_url:<string>
export async function captureLocation(page, trigger) {
  if (!trigger.startsWith('TRIGGER:LOCATION')) {
    return;
  }
  const urlStr = trigger.split('_url:')[1];
  let pathName = new URL(urlStr).pathname;
  if (pathName.startsWith('/')) {
    pathName = pathName.slice(1);
  }
  if (pathName.endsWith('/')) {
    pathName = pathName.slice(0, -1);
  }
  if (!urlStr) {
    console.error('No URL found in trigger:', trigger);
    return;
  }
  const overlayId = "player-overlay"
  const timerId = "timer"
  const styleStr = `
    div[data-test-id="${overlayId}"] { display: none !important; }
    div[data-test-id="${timerId}"] { display: none !important; }
  `
  setTimeout(() => {
    void page.screenshot({
      type: process.env.IMGFORMAT,
      quality: process.env.IMGFORMAT === 'jpeg' ? 100 : undefined,
      path: `${outDir}/pages/${pathName.replaceAll('/', '|')}.${process.env.IMGFORMAT}`,
      style: styleStr,
    })
  }, 50)
}
