import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange as DayRange } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import './calendar.css';

export type { DayRange };

export interface CalendarProps {
  selected?: DayRange;

  onPickDay: (day: Date) => void;

  picking: 'from' | 'to';

  disableAfter?: Date;

  months?: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }),
);
const MONTHS_LONG = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }),
);

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

export function Calendar({
  selected,
  onPickDay,
  picking,
  disableAfter,
  months = 1,
}: CalendarProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<Date | undefined>(undefined);

  const [anchor, setAnchor] = useState<Date>(() =>
    startOfMonth(
      selected?.from ?? addMonths(disableAfter ?? new Date(), -(months - 1)),
    ),
  );

  const [jumping, setJumping] = useState<'month' | 'year' | null>(null);

  useEffect(() => {
    if (selected?.from) setAnchor(startOfMonth(selected.from));
  }, [selected?.from?.getTime()]);

  const last = disableAfter ? startOfMonth(disableAfter) : undefined;

  const maxAnchor = last ? addMonths(last, -(months - 1)) : undefined;
  const canGoBack = true;
  const canGoForward = !maxAnchor || anchor < maxAnchor;

  const years = useMemo(() => {
    const end = (last ?? new Date()).getFullYear();
    return Array.from({ length: 12 }, (_, i) => end - 11 + i);
  }, [last?.getFullYear()]);

  const preview =
    picking === 'to' && selected?.from && hovered && hovered > selected.from
      ? { from: selected.from, to: hovered }
      : undefined;

  const step = (n: number) => {
    const next = addMonths(anchor, n);
    if (maxAnchor && next > maxAnchor) return;
    setAnchor(next);
  };

  const jump = (y: number, m: number) => {
    const next = new Date(y, m, 1);
    setAnchor(maxAnchor && next > maxAnchor ? maxAnchor : next);
    setJumping(null);
  };

  return (
    <div className="m-cal-wrap">
      <div className="m-cal__head">
        <button
          type="button"
          className="m-cal__nav"
          aria-label={t('Previous month')}
          disabled={!canGoBack}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="m-cal__jumps">
          <button
            type="button"
            className={cn(
              'm-cal__jump m-cal__jump--month',
              jumping === 'month' && 'is-open',
            )}
            aria-expanded={jumping === 'month'}
            onClick={() => setJumping((j) => (j === 'month' ? null : 'month'))}
          >
            {MONTHS_LONG[anchor.getMonth()]}
            <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn('m-cal__jump', jumping === 'year' && 'is-open')}
            aria-expanded={jumping === 'year'}
            onClick={() => setJumping((j) => (j === 'year' ? null : 'year'))}
          >
            {anchor.getFullYear()}
            <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="m-cal__nav"
          aria-label={t('Next month')}
          disabled={!canGoForward}
          onClick={() => step(1)}
        >
          <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {jumping === 'month' ? (
        <div
          className="m-cal__grid-jump"
          role="listbox"
          aria-label={t('Month')}
        >
          {MONTHS.map((label, i) => {
            const beyond =
              !!last && new Date(anchor.getFullYear(), i, 1) > last;
            return (
              <button
                type="button"
                key={label}
                role="option"
                aria-selected={i === anchor.getMonth()}
                className={cn(
                  'm-cal__cell',
                  i === anchor.getMonth() && 'is-on',
                )}
                disabled={beyond}
                onClick={() => jump(anchor.getFullYear(), i)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : jumping === 'year' ? (
        <div className="m-cal__grid-jump" role="listbox" aria-label={t('Year')}>
          {years.map((y) => (
            <button
              type="button"
              key={y}
              role="option"
              aria-selected={y === anchor.getFullYear()}
              className={cn(
                'm-cal__cell',
                y === anchor.getFullYear() && 'is-on',
              )}
              onClick={() => jump(y, anchor.getMonth())}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={() => {}}
          onDayClick={(day) => onPickDay(day)}
          onDayMouseEnter={(day) => setHovered(day)}
          onDayMouseLeave={() => setHovered(undefined)}
          modifiers={preview ? { preview } : undefined}
          modifiersClassNames={{ preview: 'is-preview' }}
          month={anchor}
          onMonthChange={setAnchor}
          numberOfMonths={months}
          disabled={disableAfter ? { after: disableAfter } : undefined}
          showOutsideDays
          weekStartsOn={1}
          className="m-cal"
          components={{ Nav: () => <></> }}
        />
      )}
    </div>
  );
}
