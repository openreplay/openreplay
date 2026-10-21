import { CheckRow } from '@/ui/inputs/CheckRow';
import { DateRange } from '@/ui/inputs/DateRange';
import { Calendar } from '@/ui/inputs/calendar';
import '@/ui/inputs/date-range.css';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { PopoverPanel } from '@/ui/overlays/popover';
import Period from 'Types/app/period';
import { ChevronDown, GitCompareArrows } from 'lucide-react';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CUSTOM_RANGE, DATE_RANGE_COMPARISON_OPTIONS } from 'App/dateRange';
import { useStore } from 'App/mstore';

import RangeGranularity from './RangeGranularity';

const DAY = 86400000;

function WidgetDateRange({
  hasGranularSettings = false,
  hasGranularity = false,
  hasComparison = false,
  presetComparison = null,
}: {
  hasGranularSettings?: boolean;
  hasGranularity?: boolean;
  hasComparison?: boolean;
  presetComparison?: string[] | null;
}) {
  const { dashboardStore, metricStore } = useStore();
  const density = dashboardStore.selectedDensity;
  const period = dashboardStore.drillDownPeriod;
  const compPeriod =
    dashboardStore.comparisonPeriods[metricStore.instance.metricId];
  const { drillDownFilter } = dashboardStore;

  const onChangePeriod = (p: any) => {
    dashboardStore.setDrillDownPeriod(p);
    const ts = p.toTimestamps();
    drillDownFilter.merge({
      startTimestamp: ts.startTimestamp,
      endTimestamp: ts.endTimestamp,
    });
  };

  const onChangeComparison = (p: any) => {
    if (
      compPeriod &&
      p &&
      compPeriod.start === p.start &&
      compPeriod.end === p.end
    )
      return;
    dashboardStore.setComparisonPeriod(p, metricStore.instance.metricId);
  };

  React.useEffect(() => {
    if (!presetComparison?.length) return;
    const option = DATE_RANGE_COMPARISON_OPTIONS.find(
      (o: any) => o.value === presetComparison[0],
    );
    const next = option
      ? Period({
          start: period.start,
          end: period.end,
          substract: option.value,
        })
      : Period({
          start: parseInt(presetComparison[0], 10),
          end: parseInt(presetComparison[1], 10),
          rangeName: CUSTOM_RANGE,
        });
    setTimeout(() => onChangeComparison(next), 1);
  }, [presetComparison]);

  const updateInstComparison = (range: string[] | null) => {
    metricStore.instance.setComparisonRange(range as any);
    metricStore.instance.updateKey('hasChanged', true);
  };

  return (
    <>
      <DateRange variant="subtle" period={period} onChange={onChangePeriod} />
      {hasGranularSettings && hasGranularity ? (
        <RangeGranularity
          period={period as any}
          density={density}
          onDensityChange={(d) => dashboardStore.setDensity(d)}
        />
      ) : null}
      {hasGranularSettings && hasComparison ? (
        <CompareTo
          period={period}
          compPeriod={compPeriod}
          onPreset={(value) => {
            if (!value) {
              updateInstComparison(null);
              onChangeComparison(null);
              return;
            }
            updateInstComparison([value]);
            onChangeComparison(
              Period({
                start: period.start,
                end: period.end,
                substract: value,
              }),
            );
          }}
          onDay={(start) => {
            const length = Math.ceil((period.end - period.start) / DAY);
            const end = start + length * DAY;
            updateInstComparison([String(start), String(end)]);
            onChangeComparison(Period({ start, end, rangeName: CUSTOM_RANGE }));
          }}
        />
      ) : null}
    </>
  );
}

/** Compare the window to a preset earlier one, or to one starting on a chosen day. */
function CompareTo({
  period,
  compPeriod,
  onPreset,
  onDay,
}: {
  period: any;
  compPeriod: any;
  onPreset: (value: string | null) => void;
  onDay: (start: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const custom = compPeriod?.rangeName === CUSTOM_RANGE;
  const preset = DATE_RANGE_COMPARISON_OPTIONS.find(
    (o: any) => o.value === compPeriod?.rangeName,
  );
  const label = custom
    ? DateTime.fromMillis(compPeriod.start).toFormat('LLL d')
    : preset
      ? t(preset.label)
      : null;

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPicking(false);
      }}
      placement="bottomLeft"
      className="m-dr__menu"
      content={
        <div role="menu" onKeyDown={menuKeyDown}>
          <p className="m-dr__field">{t('Compare to')}</p>
          {DATE_RANGE_COMPARISON_OPTIONS.map((o: any) => (
            <CheckRow
              key={o.value}
              single
              on={!custom && preset?.value === o.value}
              onToggle={() => {
                onPreset(o.value);
                setOpen(false);
              }}
            >
              {t(o.label)}
            </CheckRow>
          ))}
          <div className="m-dr__rule" />
          <CheckRow
            single
            on={custom || picking}
            onToggle={() => setPicking(true)}
          >
            {t('Starting on a day')}
          </CheckRow>
          {compPeriod ? (
            <CheckRow
              single
              on={false}
              onToggle={() => {
                onPreset(null);
                setOpen(false);
              }}
            >
              {t('No comparison')}
            </CheckRow>
          ) : null}
          {picking ? (
            <div className="m-dr__picker">
              <Calendar
                selected={
                  custom
                    ? {
                        from: new Date(compPeriod.start),
                        to: new Date(compPeriod.end),
                      }
                    : undefined
                }
                picking="from"
                disableAfter={new Date(period.start)}
                onPickDay={(day) => {
                  onDay(DateTime.fromJSDate(day).startOf('day').toMillis());
                  setOpen(false);
                  setPicking(false);
                }}
              />
            </div>
          ) : null}
        </div>
      }
    >
      <button
        type="button"
        className={`m-dr__trigger m-dr__trigger--subtle${compPeriod ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open}
      >
        <GitCompareArrows size={14} aria-hidden="true" />
        <span className="m-dr__value">
          {label
            ? t('Compare to {{period}}', { period: label.toLowerCase() })
            : t('Compare to')}
        </span>
        <ChevronDown size={13} className="m-dr__caret" aria-hidden="true" />
      </button>
    </PopoverPanel>
  );
}

export default observer(WidgetDateRange);
