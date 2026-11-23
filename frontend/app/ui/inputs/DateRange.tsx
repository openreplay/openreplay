import { cn } from '@/lib/utils';
import {
  SheetSection,
  useInFilterSheet,
  useSheetCount,
} from '@/ui/filters/PhoneFilters';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { PopoverPanel } from '@/ui/overlays/popover';
import Period from 'Types/app/period';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { DateTime } from 'luxon';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CUSTOM_RANGE, DATE_RANGE_OPTIONS } from 'App/dateRange';

import { CheckRow } from './CheckRow';
import type { DayRange } from './calendar';
import './date-range.css';
import { Input } from './input';

// react-day-picker + date-fns only matter for "Custom range"; warmed when the popover opens
const loadCalendar = () => import('./calendar');
const Calendar = lazy(() =>
  loadCalendar().then((m) => ({ default: m.Calendar })),
);

export interface DateRangeProps {
  /** A `Types/app/period` record. */
  period: any;
  onChange: (period: any) => void;
  /** What the window applies to, printed over the presets. */
  field?: string;
  options?: readonly { value: string; label: string }[];
  disableCustom?: boolean;
  /** Preset that counts as "at rest" (not highlighted). */
  resting?: string;
  variant?: 'outline' | 'subtle';
}

const iso = (ms?: number) =>
  ms ? DateTime.fromMillis(ms).toFormat('yyyy-MM-dd') : '';

// The calendar draws browser-local days, the window is in the app's timezone
// (luxon defaultZone): map by calendar day, not by instant, or a click lands on
// the day before whenever the browser is east of that timezone.
const toGridDay = (ms: number) => {
  const d = DateTime.fromMillis(ms);
  return new Date(d.year, d.month - 1, d.day);
};
const fromGridDay = (day: Date) =>
  DateTime.fromObject({
    year: day.getFullYear(),
    month: day.getMonth() + 1,
    day: day.getDate(),
  });

export function DateRange({
  period,
  onChange,
  field,
  options = DATE_RANGE_OPTIONS,
  disableCustom = false,
  resting = 'LAST_24_HOURS',
  variant = 'outline',
}: DateRangeProps) {
  const { t } = useTranslation();
  const inSheet = useInFilterSheet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'from' | 'to'>('from');
  const rangeName: string = period?.rangeName ?? resting;
  useSheetCount(inSheet && rangeName !== resting ? 1 : 0);
  useEffect(() => {
    if (inSheet) void loadCalendar();
  }, [inSheet]);
  const custom = rangeName === CUSTOM_RANGE;
  const presets = options.filter((o) => o.value !== CUSTOM_RANGE);
  const from: number | undefined = custom ? period?.start : undefined;
  const to: number | undefined = custom ? period?.end : undefined;

  const [draft, setDraft] = useState({ from: iso(from), to: iso(to) });
  const [typed, setTyped] = useState<{
    from: boolean | null;
    to: boolean | null;
  }>({ from: null, to: null });
  useEffect(() => {
    setDraft({ from: iso(from), to: iso(to) });
    setTyped({ from: null, to: null });
  }, [from, to]);

  const emitCustom = (start?: number, end?: number) => {
    if (start == null) return;
    onChange(
      Period({
        rangeName: CUSTOM_RANGE,
        start,
        end: end ?? DateTime.fromMillis(start).endOf('day').toMillis(),
      }),
    );
  };

  const label = custom
    ? from
      ? `${DateTime.fromMillis(from).toFormat('LLL d')} – ${to ? DateTime.fromMillis(to).toFormat('LLL d') : '…'}`
      : t('Custom range')
    : t(options.find((o) => o.value === rangeName)?.label ?? rangeName);

  const onType = (end: 'from' | 'to', text: string) => {
    setDraft((d) => ({ ...d, [end]: text }));
    if (!text) {
      setTyped((s) => ({ ...s, [end]: null }));
      return;
    }
    const at = /^\d{4}-\d{2}-\d{2}$/.test(text) ? DateTime.fromISO(text) : null;
    const ms = at?.isValid
      ? end === 'from'
        ? at.startOf('day').toMillis()
        : at.endOf('day').toMillis()
      : null;
    // a bound past the other end would send an inverted range
    const ok =
      ms != null &&
      at!.toMillis() <= Date.now() &&
      (end === 'from' ? to == null || ms <= to : from == null || ms >= from);
    setTyped((s) => ({ ...s, [end]: ok }));
    if (!ok || ms == null) return;
    if (end === 'from') emitCustom(ms, to);
    else emitCustom(from, ms);
  };

  const range: DayRange | undefined = from
    ? { from: toGridDay(from), to: to ? toGridDay(to) : undefined }
    : undefined;

  const onPickDay = (day: Date) => {
    const at = fromGridDay(day);
    if (step === 'from' || (from != null && at.toMillis() < from)) {
      emitCustom(at.startOf('day').toMillis(), at.endOf('day').toMillis());
      setStep('to');
      return;
    }
    emitCustom(from, at.endOf('day').toMillis());
    setStep('from');
    setOpen(false);
  };

  const menu = (
    <div
      role="menu"
      onKeyDown={menuKeyDown}
      className={cn('m-dr__layout', custom && 'has-picker')}
    >
      <div className="m-dr__list">
        {field && <p className="m-dr__field">{field}</p>}
        {presets.map((pr) => (
          <CheckRow
            key={pr.value}
            single
            on={rangeName === pr.value}
            onToggle={() => {
              onChange(Period({ rangeName: pr.value }));
              setOpen(false);
            }}
          >
            {t(pr.label)}
          </CheckRow>
        ))}
        {!disableCustom && (
          <>
            <div className="m-dr__rule" />
            <CheckRow
              single
              on={custom}
              onToggle={() =>
                emitCustom(
                  DateTime.now().minus({ days: 7 }).startOf('day').toMillis(),
                  DateTime.now().endOf('day').toMillis(),
                )
              }
            >
              {t('Custom range')}
            </CheckRow>
          </>
        )}
      </div>
      {custom && (
        <div className="m-dr__picker">
          <div className="m-dr__fields">
            <Input
              className={cn(
                'm-dr__input',
                step === 'from' && 'is-active',
                typed.from === false && 'is-bad',
              )}
              value={draft.from}
              placeholder={t('Start')}
              aria-label={t('Start date')}
              onFocus={() => setStep('from')}
              onChange={(e) => onType('from', e.target.value)}
            />
            <Input
              className={cn(
                'm-dr__input',
                step === 'to' && 'is-active',
                typed.to === false && 'is-bad',
              )}
              value={draft.to}
              placeholder={t('End')}
              aria-label={t('End date')}
              onFocus={() => setStep('to')}
              onChange={(e) => onType('to', e.target.value)}
            />
          </div>
          <Suspense fallback={null}>
            <Calendar
              selected={range}
              onPickDay={onPickDay}
              picking={step}
              disableAfter={new Date()}
            />
          </Suspense>
        </div>
      )}
    </div>
  );

  // the phone filter drawer: the presets as rows, the calendar under them
  if (inSheet)
    return (
      <SheetSection title={field ?? t('Time range')}>
        <div className="m-dr__sheet">{menu}</div>
      </SheetSection>
    );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        if (o) void loadCalendar();
        setOpen(o);
        if (o) setStep('from');
      }}
      placement="bottomRight"
      className="m-dr__menu"
      content={menu}
    >
      <button
        type="button"
        className={`m-dr__trigger${variant === 'subtle' ? ' m-dr__trigger--subtle' : ''}${rangeName !== resting ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={field ? `${field}: ${label}` : label}
      >
        <CalendarRange size={14} aria-hidden="true" />
        <span className="m-dr__value">{label}</span>
        <ChevronDown size={13} className="m-dr__caret" aria-hidden="true" />
      </button>
    </PopoverPanel>
  );
}
