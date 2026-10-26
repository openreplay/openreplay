import { expect, test } from '@playwright/test';

import { session as recordedSession } from '../../mocks/sessionResponse';
import { MOBS_HOST, PROJECT_ID, login, mockApi } from './mockApi';

/* Heatmap card over the 2023 tracker-4.1.8 recording in tests/mocks: its first
   file has no header, so the session must say trackerVersion 4.1.8. */
const recording = recordedSession.data;
const SESSION_ID = recording.sessionId;
// last click on /3064/sessions ("Nova Proposta"), 14.44s into the recording
const LAST_CLICK_TS = recording.startTs + 14440;

const HOT = { x: 50, y: 10 };
// TargetMarker's canvas; the screen also holds the mouse-trail canvas
const OVERLAY =
  '#clickmap-render .m-cmap__window canvas:not(#openreplay-mouse-trail)';

const card = {
  metricId: 10,
  name: 'E2E heatmap',
  metricType: 'heatMap',
  metricOf: 'heatMapUrl',
  metricFormat: 'sessionCount',
  viewType: 'chart',
  series: [
    {
      seriesId: 1,
      name: 'Series 1',
      filter: {
        eventsOrder: 'then',
        filters: [
          {
            name: 'LOCATION',
            isEvent: true,
            autoCaptured: true,
            operator: 'is',
            value: [],
            filters: [
              {
                name: 'url_path',
                operator: 'is',
                value: ['/3064/sessions'],
                autoCaptured: true,
              },
            ],
          },
        ],
      },
    },
  ],
  config: { position: 0, col: 4, row: 2 },
  dashboards: [],
  isPublic: false,
  createdAt: '2026-10-01T00:00:00Z',
};

const heatmapSession = {
  sessionId: SESSION_ID,
  startTs: Math.floor(recording.startTs / 1000) * 1000,
  duration: recording.duration,
  eventTimestamp: LAST_CLICK_TS,
  urlPath: '/3064/sessions',
  deviceType: 'desktop',
};

function points() {
  const pts = [{ normalizedX: HOT.x, normalizedY: HOT.y, count: 40 }];
  for (let i = 0; i < 30; i++) {
    pts.push({
      normalizedX: 10 + ((i * 37) % 80),
      normalizedY: 20 + ((i * 53) % 70),
      count: 1 + (i % 3),
    });
  }
  return pts;
}

// sessions by the deepest point they saw; everyone sees the first 30%
const SCROLL_DATA = {
  sessions: 1200,
  fold: 30,
  depths: [
    { depth: 30, sessions: 200 },
    { depth: 45, sessions: 250 },
    { depth: 60, sessions: 300 },
    { depth: 80, sessions: 250 },
    { depth: 100, sessions: 200 },
  ],
};

async function setup(page: any, baseURL: string) {
  const api = await mockApi(page, baseURL);
  const chartRequests: any[] = [];
  api.on('GET', /\/cards\/10$/, () => ({ data: card }));
  const chart = (_req: any, body: any) => {
    chartRequests.push(body);
    if (body?.metricType !== 'heatmaps_session')
      return { data: heatmapSession };
    return {
      data: body.metricOf === 'scrollMapUrl' ? SCROLL_DATA : points(),
    };
  };
  api.on('POST', /\/cards\/10\/chart$/, chart);
  api.on('POST', /\/cards\/try$/, chart);
  api.on('GET', new RegExp(`/sessions/${SESSION_ID}/replay$`), () => ({
    data: {
      ...recording,
      domURL: [`${MOBS_HOST}/dom1.mobs`, `${MOBS_HOST}/dom2.mobe`],
      mobsUrl: [],
      devtoolsURL: [],
    },
  }));
  await login(page);
  return { api, chartRequests };
}

/** ms since navigation at which the replay first painted and the overlay appeared */
function waitForOverlay(page: any) {
  return page.evaluate(
    (OVERLAY: string) =>
      new Promise<{ painted: number; overlay: number }>((resolve) => {
        let painted = 0;
        const tick = () => {
          const root = document.querySelector('#clickmap-render');
          const iframe = root?.querySelector('iframe');
          if (!painted && iframe?.contentDocument?.body?.childElementCount) {
            painted = performance.now();
          }
          if (root?.querySelector(OVERLAY)) {
            resolve({ painted, overlay: performance.now() });
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      }),
    OVERLAY,
  );
}

function overlayGeometry(page: any) {
  return page.evaluate((OVERLAY: string) => {
    const root = document.querySelector('#clickmap-render')!;
    const canvas = root.querySelector(OVERLAY) as HTMLCanvasElement;
    const iframe = root.querySelector('iframe')!;
    return {
      canvasCss: parseFloat(canvas.style.height),
      docHeight: iframe.contentDocument!.documentElement.scrollHeight,
      iframeCss: parseFloat(iframe.style.height),
    };
  }, OVERLAY);
}

test.describe('heatmap card', () => {
  test.setTimeout(120_000);

  test('renders the click heatmap over the replay', async ({
    page,
    baseURL,
  }) => {
    const { api, chartRequests } = await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    const timing = await waitForOverlay(page);
    console.log(
      `heatmap overlay at ${Math.round(timing.overlay)}ms, ` +
        `${Math.round(timing.overlay - timing.painted)}ms after the replay painted`,
    );

    const geometry = await overlayGeometry(page);
    expect(geometry.canvasCss).toBe(geometry.docHeight);
    expect(geometry.iframeCss).toBe(geometry.docHeight);

    const hotAlpha = await page.evaluate(
      ({ x, y, OVERLAY }) => {
        const canvas = document.querySelector(OVERLAY) as HTMLCanvasElement;
        const px = Math.round((x / 100) * canvas.width);
        const py = Math.round((y / 100) * canvas.height);
        return canvas.getContext('2d')!.getImageData(px, py, 1, 1).data[3];
      },
      { ...HOT, OVERLAY },
    );
    expect(hotAlpha).toBeGreaterThan(0);

    expect(chartRequests.map((b) => b.metricType).sort()).toEqual([
      'heatMap',
      'heatmaps_session',
    ]);
    expect(api.mobRequests).toEqual(['dom1.mobs', 'dom2.mobe']);
  });

  test('overlay follows layout growth after it is drawn', async ({
    page,
    baseURL,
  }) => {
    await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);
    const before = await overlayGeometry(page);

    // an image of the frozen page finishing its download after the overlay was drawn
    await page.evaluate(() => {
      const iframe = document.querySelector(
        '#clickmap-render iframe',
      ) as HTMLIFrameElement;
      const doc = iframe.contentDocument!;
      const img = doc.createElement('img');
      img.style.display = 'block';
      img.src =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="3000"/>',
        );
      doc.body.appendChild(img);
    });

    await expect
      .poll(async () => {
        const g = await overlayGeometry(page);
        return {
          grew: g.docHeight > before.docHeight,
          canvasFits: g.canvasCss === g.docHeight,
          iframeFits: g.iframeCss === g.docHeight,
        };
      })
      .toEqual({ grew: true, canvasFits: true, iframeFits: true });
  });

  test('clicking a cluster drills down into sessions with clicks there', async ({
    page,
    baseURL,
  }) => {
    const { api } = await setup(page, baseURL!);
    const searches: any[] = [];
    api.on('POST', /\/sessions\/search$/, (_req, body) => {
      searches.push(body);
      return { data: { sessions: [], total: 0 } };
    });
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);

    const box = (await page.locator(OVERLAY).boundingBox())!;
    await page.mouse.click(
      box.x + (HOT.x / 100) * box.width,
      box.y + (HOT.y / 100) * box.height,
    );

    await expect
      .poll(() => {
        const click = searches
          .flatMap((b) => b?.filters ?? [])
          .find((f: any) => f.name === 'CLICK');
        const bound = (name: string, op: string) =>
          Number(
            click?.filters.find(
              (f: any) => f.name === name && f.operator === op,
            )?.value[0],
          );
        return (
          !!click &&
          bound('normalizedX', '>') < HOT.x &&
          bound('normalizedX', '<') > HOT.x &&
          bound('normalizedY', '>') < HOT.y &&
          bound('normalizedY', '<') > HOT.y
        );
      })
      .toBe(true);
  });

  test('click-rage toggle reloads clicks without reloading the replay', async ({
    page,
    baseURL,
  }) => {
    const { api, chartRequests } = await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);

    const rage = page.getByRole('button', { name: 'Include rage clicks' });
    await expect(rage).toHaveAttribute('aria-pressed', 'false');
    await rage.click();
    await expect(rage).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() =>
        chartRequests.some(
          (b) => b.metricType === 'heatmaps_session' && b.includeClickRage,
        ),
      )
      .toBe(true);
    await expect(page.locator(OVERLAY)).toBeVisible();
    // the same session comes back, so the mounted replay is reused
    expect(api.mobRequests).toEqual(['dom1.mobs', 'dom2.mobe']);
  });

  test('"Get a new image" asks for another session', async ({
    page,
    baseURL,
  }) => {
    const { chartRequests } = await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);

    await page.getByRole('button', { name: 'Get a new image' }).click();
    await expect
      .poll(() =>
        chartRequests
          .filter((b) => b.metricType === 'heatMap')
          .map((b) => b.heatmapSeed ?? 0),
      )
      .toEqual([0, 1]);
  });

  test('scroll map tints the page by reach, with the fold and reach lines', async ({
    page,
    baseURL,
  }) => {
    const { api, chartRequests } = await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);

    await page.getByRole('button', { name: 'Heatmap' }).click();
    await page.getByRole('menuitemradio', { name: 'Scroll map' }).click();

    const layer = page.locator(
      '#clickmap-render .m-cmap__window .m-cmap__layer',
    );
    await expect(layer.locator('.m-cmap__reach')).toBeVisible();
    await expect(layer.getByText('Fold')).toBeVisible();
    for (const share of [75, 50, 25]) {
      await expect(layer.getByText(`${share}% reached`)).toBeVisible();
    }
    // 50% of sessions saw at least 60% of the page
    await expect(page.locator('.m-cmap__legend')).toContainText(
      '1,200 sessions',
    );
    await expect(page.locator('.m-cmap__legend')).toContainText(
      'Half reach 61% of the page',
    );
    // the click layer is gone, the rage toggle too
    await expect(page.locator(OVERLAY)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Include rage clicks' }),
    ).toHaveCount(0);
    expect(
      chartRequests.some(
        (b) =>
          b.metricType === 'heatmaps_session' && b.metricOf === 'scrollMapUrl',
      ),
    ).toBe(true);
    // same session: the replay stays mounted
    expect(api.mobRequests).toEqual(['dom1.mobs', 'dom2.mobe']);

    // labels keep their size inside the scaled page
    const labelHeight = await layer
      .getByText('Fold')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(labelHeight).toBeGreaterThan(12);
  });

  test('the minimap moves the window through a long page', async ({
    page,
    baseURL,
  }) => {
    await setup(page, baseURL!);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await waitForOverlay(page);
    await page.evaluate(() => {
      const iframe = document.querySelector(
        '#clickmap-render iframe',
      ) as HTMLIFrameElement;
      const tall = iframe.contentDocument!.createElement('div');
      tall.style.height = '6000px';
      iframe.contentDocument!.body.appendChild(tall);
    });
    const win = page.locator('#clickmap-render .m-cmap__window');
    await expect
      .poll(() => win.evaluate((w) => w.scrollHeight > w.clientHeight * 2))
      .toBe(true);

    const mini = page.getByRole('scrollbar', { name: /Page overview/ });
    const box = (await mini.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4, {
      steps: 5,
    });
    await page.mouse.up();

    const scrolled = await win.evaluate((w) => w.scrollTop / w.scrollHeight);
    expect(scrolled).toBeGreaterThan(0.5);
    const viewTop = await page
      .locator('.m-cmap__view')
      .evaluate((el) => parseFloat((el as HTMLElement).style.top));
    expect(viewTop).toBeCloseTo(scrolled * 100, 0);
  });

  test('a card collapses the side menu and leaving restores it', async ({
    page,
    baseURL,
  }) => {
    const api = await mockApi(page, baseURL!);
    api.on('GET', /\/cards\/10$/, () => ({ data: card }));
    api.on('GET', /\/cards$/, () => ({ data: { list: [card], total: 1 } }));
    await login(page);

    await page.goto(`/${PROJECT_ID}/metrics`);
    await expect(page.locator('.m-nav')).not.toHaveClass(/is-collapsed/);
    await page.goto(`/${PROJECT_ID}/metrics/10`);
    await expect(page.locator('.m-nav')).toHaveClass(/is-collapsed/);
    await page.goBack();
    await expect(page.locator('.m-nav')).not.toHaveClass(/is-collapsed/);
  });
});
