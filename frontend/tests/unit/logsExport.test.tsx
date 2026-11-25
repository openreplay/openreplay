import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React, { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { ExportControl } from '../../app/components/Observability/LogsToolbar';
import { SearchChangedError } from '../../app/components/Observability/logs-logic';
import { TooltipProvider } from '../../app/ui/overlays/tooltip';

const mockError = jest.fn();
jest.mock('@/ui/overlays/toast', () => ({
  toast: { error: (...a: unknown[]) => mockError(...a) },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) =>
      k.replace(/{{(\w+)}}/g, (_, n) => String(o?.[n] ?? '')),
  }),
}));
jest.mock('App/utils/download', () => ({
  ...(jest.requireActual('App/utils/download') as object),
  saveBlob: jest.fn(),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (b) => b.textContent === name || b.getAttribute('aria-label') === name,
  )!;

describe('ExportControl', () => {
  let root: Root;
  let collect: jest.Mock<(s: AbortSignal) => Promise<any[]>>;
  const render = async (loaded: number) =>
    act(async () =>
      root.render(
        <TooltipProvider>
          <ExportControl
            total={10_000}
            loaded={loaded}
            collect={collect}
            from={0}
            to={60_000}
            columns={[]}
            ruleCount={0}
          />
        </TooltipProvider>,
      ),
    );
  const start = async () => {
    await act(async () => button('Export').click());
    await act(async () => button('Download').click());
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    mockError.mockClear();
    collect = jest.fn<(s: AbortSignal) => Promise<any[]>>();
  });

  test('counts the lines as they load, and Cancel stops it', async () => {
    const run = deferred<any[]>();
    collect.mockReturnValueOnce(run.promise);
    await render(50);
    await start();
    await render(2_500);
    expect(document.body.textContent).toContain('2,500 of 10,000');
    const signal = collect.mock.calls[0][0];
    await act(async () => button('Cancel').click());
    expect(signal.aborted).toBe(true);
    expect(document.body.textContent).not.toContain('2,500 of 10,000');
    await act(async () => run.resolve([]));
    expect(mockError).not.toHaveBeenCalled();
  });

  test('closing the popover stops it', async () => {
    collect.mockReturnValueOnce(new Promise(() => {}));
    await render(50);
    await start();
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(collect.mock.calls[0][0].aborted).toBe(true);
  });

  test('a changed search says so', async () => {
    const run = deferred<any[]>();
    collect.mockReturnValueOnce(run.promise);
    await render(50);
    await start();
    await act(async () => run.reject(new SearchChangedError('x')));
    expect(mockError).toHaveBeenCalledWith('The search changed, export again.');
  });
});
