import { describe, expect, test } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ToastProvider, toast } from '../../app/ui/overlays/toast';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('toast before the provider mounts', () => {
  test('a pending toast.promise that settles first never shows', async () => {
    await toast.promise(Promise.resolve(), {
      pending: 'Working',
      success: 'Done',
    });
    const id = toast.info('Dismissed early');
    toast.dismiss(id);
    toast.error('Kept');

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <ToastProvider>
          <span />
        </ToastProvider>,
      );
    });
    const text = document.body.textContent ?? '';
    expect(text).toContain('Done');
    expect(text).toContain('Kept');
    expect(text).not.toContain('Working');
    expect(text).not.toContain('Dismissed early');
    await act(async () => root.unmount());
  });
});
