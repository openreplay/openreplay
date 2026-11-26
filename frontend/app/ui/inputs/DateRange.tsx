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
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
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
  /** each end of a custom range is a day and a time of day, in separate fields */
  withTime?: boolean;
  /** shown and picked in this zone; luxon defaultZone (the app's) when unset */
  zone?: string;
}

type End = 'from' | 'to';
type Ends = { from?: number; to?: number };

const inZone = (ms: number, zone?: string) => DateTime.fromMillis(ms, { zone });
const dayText = (ms?: number, zone?: string) =>
  ms != null ? inZone(ms, zone).toFormat('yyyy-MM-dd') : '';
const clock = (ms?: number, zone?: string) =>
  ms != null ? inZone(ms, zone).toFormat('HH:mm') : undefined;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_TIMES = { from: '00:00', to: '23:59' };

// The calendar draws browser-local days, the window is in the app's timezone
// (luxon defaultZone): map by calendar day, not by instant, or a click lands on
// the day before whenever the browser is east of that timezone.
const toGridDay = (ms: number, zone?: string) => {
  const d = inZone(ms, zone);
  return new Date(d.year, d.month - 1, d.day);
};
const fromGridDay = (day: Date, zone?: string) =>
  DateTime.fromObject(
    {
      year: day.getFullYear(),
      month: day.getMonth() + 1,
      day: day.getDate(),
    },
    { zone },
  );

export function DateRange({
  period,
  onChange,
  field,
  options = DATE_RANGE_OPTIONS,
  disableCustom = false,
  resting = 'LAST_24_HOURS',
  variant = 'outline',
  withTime = false,
  zone,
}: DateRangeProps) {
  const { t } = useTranslation();
  const inSheet = useInFilterSheet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<End>('from');
  const rangeName: string = period?.rangeName ?? resting;
  useSheetCount(inSheet && rangeName !== resting ? 1 : 0);
  useEffect(() => {
    if (inSheet) void loadCalendar();
  }, [inSheet]);
  const custom = rangeName === CUSTOM_RANGE;
  const presets = options.filter((o) => o.value !== CUSTOM_RANGE);
  const from: number | undefined = custom ? period?.start : undefined;
  const to: number | undefined = custom ? period?.end : undefined;

  // a range being picked; applied only once both ends are set
  const [draft, setDraft] = useState<Ends | null>(null);
  const shown: Ends = draft ?? { from, to };
  const showPicker = custom || draft != null;

  const [text, setText] = useState({
    from: dayText(shown.from, zone),
    to: dayText(shown.to, zone),
  });
  const [times, setTimes] = useState({
    from: clock(shown.from, zone) ?? DEFAULT_TIMES.from,
    to: clock(shown.to, zone) ?? DEFAULT_TIMES.to,
  });
  const [bad, setBad] = useState<{
    from?: 'day' | 'time';
    to?: 'day' | 'time';
  }>({});
  useEffect(() => {
    setText({ from: dayText(shown.from, zone), to: dayText(shown.to, zone) });
    setTimes((c) => ({
      from: clock(shown.from, zone) ?? c.from,
      to: clock(shown.to, zone) ?? c.to,
    }));
    setBad({});
  }, [shown.from, shown.to, open, zone]);
  // times typed since the menu opened; the others reset with a new range
  const edited = useRef<{ from?: boolean; to?: boolean }>({});
  useEffect(() => {
    edited.current = {};
  }, [open]);

  const close = () => {
    setOpen(false);
    setDraft(null);
  };

  /** false when the ends would be inverted */
  const commit = (next: Ends) => {
    if (next.from == null || next.to == null) {
      setDraft(next);
      return true;
    }
    if (next.from > next.to) return false;
    setDraft(null);
    onChange(
      Period({ rangeName: CUSTOM_RANGE, start: next.from, end: next.to }),
    );
    return true;
  };

  /** `day` is a start of day in the app's timezone */
  const endAt = (day: DateTime, end: End, time = times[end]) => {
    if (!withTime)
      return (
        end === 'from' ? day.startOf('day') : day.endOf('day')
      ).toMillis();
    const [hour, minute] = time.split(':').map(Number);
    const at = day.set({ hour, minute });
    return (
      end === 'from' ? at.startOf('minute') : at.endOf('minute')
    ).toMillis();
  };

  const sameDay =
    shown.from != null &&
    shown.to != null &&
    inZone(shown.from, zone).hasSame(inZone(shown.to, zone), 'day');
  const stamp = (ms: number, day = true) =>
    inZone(ms, zone).toFormat(
      withTime ? (day ? 'LLL d, HH:mm' : 'HH:mm') : 'LLL d',
    );
  const label = shown.from
    ? `${stamp(shown.from)} – ${shown.to ? stamp(shown.to, !(withTime && sameDay)) : '…'}`
    : custom
      ? t('Custom range')
      : t(options.find((o) => o.value === rangeName)?.label ?? rangeName);

  const onType = (end: End, value: string) => {
    setText((d) => ({ ...d, [end]: value }));
    if (!value) {
      setBad((b) => ({ ...b, [end]: undefined }));
      commit({ ...shown, [end]: undefined });
      return;
    }
    const day = DAY.test(value) ? DateTime.fromISO(value, { zone }) : null;
    const ok =
      !!day?.isValid &&
      day.toMillis() <= Date.now() &&
      commit({ ...shown, [end]: endAt(day, end) });
    setBad((b) => ({ ...b, [end]: ok ? undefined : 'day' }));
  };

  // with no day on that end yet, the time waits for one
  const onTime = (end: End, value: string) => {
    if (!TIME.test(value)) return;
    edited.current[end] = true;
    setTimes((c) => ({ ...c, [end]: value }));
    const cur = shown[end];
    const day =
      cur != null
        ? inZone(cur, zone).startOf('day')
        : DAY.test(text[end])
          ? DateTime.fromISO(text[end], { zone })
          : null;
    if (!day?.isValid) return;
    const ok = commit({ ...shown, [end]: endAt(day, end, value) });
    setBad((b) => ({ ...b, [end]: ok ? undefined : 'time' }));
  };

  const range: DayRange | undefined = shown.from
    ? {
        from: toGridDay(shown.from, zone),
        to: shown.to ? toGridDay(shown.to, zone) : undefined,
      }
    : undefined;

  const onPickDay = (day: Date) => {
    const at = fromGridDay(day, zone);
    const startDay =
      shown.from != null
        ? inZone(shown.from, zone).startOf('day').toMillis()
        : null;
    if (step === 'from' || startDay == null || at.toMillis() < startDay) {
      const next = {
        from: edited.current.from ? times.from : DEFAULT_TIMES.from,
        to: edited.current.to ? times.to : DEFAULT_TIMES.to,
      };
      setTimes(next);
      commit({ from: endAt(at, 'from', next.from) });
      setStep('to');
      return;
    }
    const to = endAt(at, 'to');
    const ok = commit({ from: shown.from, to });
    if (!ok) {
      // the day stays in its field so End time can still fix the range
      setText((d) => ({ ...d, to: dayText(to, zone) }));
      setBad((b) => ({ ...b, to: 'time' }));
      return;
    }
    setStep('from');
    // with times, the panel stays: the hours come after the days
    if (!withTime) close();
  };

  const ends = (['from', 'to'] as const).map((end) => (
    <div key={end} className="m-dr__end">
      <Input
        className={cn(
          'm-dr__input',
          step === end && 'is-active',
          bad[end] === 'day' && 'is-bad',
        )}
        value={text[end]}
        placeholder={end === 'from' ? t('Start') : t('End')}
        aria-label={end === 'from' ? t('Start date') : t('End date')}
        onFocus={() => setStep(end)}
        onChange={(e) => onType(end, e.target.value)}
      />
      {withTime && (
        <Input
          type="time"
          className={cn(
            'm-dr__time',
            step === end && 'is-active',
            bad[end] === 'time' && 'is-bad',
          )}
          value={times[end]}
          aria-label={end === 'from' ? t('Start time') : t('End time')}
          onFocus={() => setStep(end)}
          onChange={(e) => onTime(end, e.target.value)}
        />
      )}
    </div>
  ));

  const menu = (
    <div
      role="menu"
      onKeyDown={menuKeyDown}
      className={cn('m-dr__layout', showPicker && 'has-picker')}
    >
      <div className="m-dr__list">
        {field && <p className="m-dr__field">{field}</p>}
        {presets.map((pr) => (
          <CheckRow
            key={pr.value}
            single
            on={rangeName === pr.value && draft == null}
            onToggle={() => {
              onChange(Period({ rangeName: pr.value }));
              close();
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
              on={showPicker}
              onToggle={() => {
                if (!custom && draft == null) {
                  setDraft({});
                  setTimes(DEFAULT_TIMES);
                }
                setStep(shown.from != null && shown.to == null ? 'to' : 'from');
              }}
            >
              {t('Custom range')}
            </CheckRow>
          </>
        )}
      </div>
      {showPicker && (
        <div className={cn('m-dr__picker', withTime && 'has-time')}>
          <div className="m-dr__fields">{ends}</div>
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
        if (o) {
          void loadCalendar();
          setOpen(true);
          setStep('from');
        } else close();
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
