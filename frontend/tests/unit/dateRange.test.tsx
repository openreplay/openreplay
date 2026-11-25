import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { DateTime } from 'luxon';
import React, { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { DateRange } from '../../app/ui/inputs/DateRange';

jest.mock('react-i18next', () => ({
  ...(jest.requireActual('react-i18next') as object),
  useTranslation: () => ({ t: (k: string) => k }),
}));

const DAY = new Date(2026, 10, 20);
jest.mock('../../app/ui/inputs/calendar', () => ({
  Calendar: ({ onPickDay }: { onPickDay: (d: Date) => void }) => (
    <button type="button" data-testid="day" onClick={() => onPickDay(DAY)}>
      20
    </button>
  ),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const at = (h: number, m: number) =>
  DateTime.fromJSDate(DAY).set({ hour: h, minute: m }).toMillis();

let root: Root;
afterEach(() => act(() => root.unmount()));

async function mount(onChange: (p: any) => void) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <DateRange
        withTime
        onChange={onChange}
        period={{
          rangeName: 'CUSTOM_RANGE',
          start: at(14, 23),
          end: at(14, 41),
        }}
      />,
    ),
  );
  await act(async () =>
    (document.querySelector('.m-dr__trigger') as HTMLElement).click(),
  );
  await act(() => new Promise((r) => setTimeout(r, 0)));
}

const pickDay = () =>
  act(async () =>
    (document.querySelector('[data-testid=day]') as HTMLElement).click(),
  );

async function typeTime(label: string, value: string) {
  const input = document.querySelector(
    `input[aria-label="${label}"]`,
  ) as HTMLInputElement;
  const set = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('DateRange with times', () => {
  test('a day picked twice after a zoomed window is the whole day', async () => {
    const onChange = jest.fn();
    await mount(onChange);
    await pickDay();
    expect(onChange).not.toHaveBeenCalled();
    await pickDay();
    expect(onChange).toHaveBeenCalledTimes(1);
    const p = onChange.mock.calls[0][0] as any;
    expect(p.start).toBe(at(0, 0));
    expect(p.end).toBe(
      DateTime.fromMillis(at(23, 59)).endOf('minute').toMillis(),
    );
  });

  test('inverted times on one day can be fixed from End time', async () => {
    const onChange = jest.fn();
    await mount(onChange);
    await typeTime('Start time', '18:00');
    await typeTime('End time', '09:00');
    await pickDay();
    await pickDay();
    expect(onChange).not.toHaveBeenCalled();
    await typeTime('End time', '20:00');
    expect(onChange).toHaveBeenCalledTimes(1);
    const p = onChange.mock.calls[0][0] as any;
    expect(p.start).toBe(at(18, 0));
    expect(p.end).toBe(
      DateTime.fromMillis(at(20, 0)).endOf('minute').toMillis(),
    );
  });
});
