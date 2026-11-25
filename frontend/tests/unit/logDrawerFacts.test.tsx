import { describe, expect, jest, test } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { LogDrawer } from '../../app/components/Observability/LogDrawer';
import { TooltipProvider } from '../../app/ui/overlays/tooltip';

jest.mock('react-i18next', () => ({
  ...(jest.requireActual('react-i18next') as object),
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) =>
      k.replace(/{{(\w+)}}/g, (_, n) => String(o?.[n] ?? '')),
  }),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('LogDrawer head facts', () => {
  test('a fact opens its attribute row menu, the duration none', async () => {
    const onTerm = jest.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <TooltipProvider>
          <LogDrawer
            line={
              {
                id: '1',
                timestamp: '1700000000123456789',
                severityText: 'INFO',
                severityNumber: 9,
                serviceName: 'api',
                body: 'hi',
                traceId: '',
                spanId: '',
                logAttributes: {
                  'http.method': 'GET',
                  'url.path': '/a',
                  duration_ms: '12',
                },
                resourceAttributes: { 'k8s.pod.name': 'api-1' },
                scopeName: '',
                scopeAttributes: {},
              } as any
            }
            onClose={() => {}}
            related={async () => []}
            onOpen={() => {}}
            termState={() => undefined}
            onTerm={onTerm}
            columns={[]}
            onToggleColumn={() => {}}
            withDate={false}
          />
        </TooltipProvider>,
      ),
    );
    const doors = [...document.querySelectorAll('.m-facts__door')].map((d) =>
      d.getAttribute('aria-label'),
    );
    expect(doors).toEqual(['Pod: api-1, options', 'Request: GET /a, options']);

    const request = document.querySelector<HTMLElement>(
      '[aria-label="Request: GET /a, options"]',
    )!;
    await act(async () => {
      request.focus();
      request.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    const filter = [...document.querySelectorAll('[role="menuitem"]')].find(
      (m) => m.textContent?.startsWith('Filter by'),
    ) as HTMLElement;
    expect(filter.textContent).toBe('Filter by url.path: /a');
    await act(async () => filter.click());
    expect(onTerm).toHaveBeenCalledWith('attr.url.path', '/a', 'is', true);
    await act(async () => root.unmount());
  });
});
