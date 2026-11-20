import { expect, test } from '@playwright/test';

import { session as recordedSession } from '../../mocks/sessionResponse';
import { MOBS_HOST, PROJECT_ID, login, mockApi } from './mockApi';

const recording = recordedSession.data;

async function openReplay(page: any, baseURL: string) {
  const api = await mockApi(page, baseURL);
  api.on('GET', new RegExp(`/sessions/${recording.sessionId}/replay$`), () => ({
    data: {
      ...recording,
      domURL: [`${MOBS_HOST}/dom1.mobs`, `${MOBS_HOST}/dom2.mobe`],
      mobsUrl: [],
      devtoolsURL: [],
    },
  }));
  api.on('GET', /\/\d+\/metadata$/, () => ({ data: [] }));
  api.on('GET', /\/integrations$/, () => ({ data: [] }));
  api.on('GET', /\/sessions\/\d+\/events$/, () => ({
    data: { events: [], errors: [], issues: [], resources: [], stackEvents: [] },
  }));
  await login(page);
  await page.goto(`/${PROJECT_ID}/session/${recording.sessionId}`);
}

/** counts player.togglePlay calls, whoever makes them */
function countToggles(page: any) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="player-inst"]') as any;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber'))!;
    let f = el[key];
    while (f && !f.memoizedProps?.value?.player?.togglePlay) f = f.return;
    const { player } = f.memoizedProps.value;
    const orig = player.togglePlay;
    (window as any).__toggles = 0;
    player.togglePlay = (...args: any[]) => {
      (window as any).__toggles += 1;
      return orig.apply(player, args);
    };
  });
}

const toggles = (page: any) => page.evaluate(() => (window as any).__toggles);

test.describe('replay keyboard', () => {
  test.setTimeout(90_000);

  test('Space toggles playback exactly once', async ({ page, baseURL }) => {
    await openReplay(page, baseURL!);
    const button = page.locator(
      'button[aria-label="Pause (Space)"], button[aria-label="Play (Space)"]',
    );
    await expect(button).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    if ((await button.getAttribute('aria-label')) === 'Pause (Space)') {
      await button.click();
    }
    await expect(button).toHaveAttribute('aria-label', 'Play (Space)');
    await countToggles(page);

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-label', 'Pause (Space)');
    expect(await toggles(page)).toBe(1);

    // a focused toolbar button must not also be clicked by the same Space
    await page.locator('button[aria-label^="Back "]').focus();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-label', 'Play (Space)');
    expect(await toggles(page)).toBe(2);

    // the playhead keeps Space as play/pause
    await page.locator('[role="slider"][aria-label="Playhead"]').focus();
    await page.keyboard.press('Space');
    expect(await toggles(page)).toBe(3);
    await page.keyboard.press('Space');
    expect(await toggles(page)).toBe(4);

    // a field that owns its keys gets the space, playback is left alone
    await page.evaluate(() => {
      const box = document.createElement('div');
      box.id = 'e2e-editable';
      box.contentEditable = 'true';
      document.body.appendChild(box);
    });
    await page.locator('#e2e-editable').focus();
    await page.keyboard.type('a b');
    expect(await page.locator('#e2e-editable').innerText()).toBe('a b');
    expect(await toggles(page)).toBe(4);
  });
});
