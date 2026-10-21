import { MenuButton } from '@/ui/actions/menu-button';
import React from 'react';
import { useTranslation } from 'react-i18next';

function RangeGranularity({
  period,
  density,
  onDensityChange,
}: {
  period: {
    getDuration(): number;
  };
  density: number;
  onDensityChange: (density: number) => void;
}) {
  const { t } = useTranslation();
  const granularityOptions = React.useMemo(() => {
    if (!period) return [];
    return calculateGranularities(period.getDuration());
  }, [period]);

  React.useEffect(() => {
    if (granularityOptions.length === 0) return;
    const defaultOption = Math.max(
      granularityOptions.filter((opt) => !opt.disabled).length - 2,
      0,
    );
    onDensityChange(granularityOptions[defaultOption].key);
  }, [period, granularityOptions.length]);

  return (
    <MenuButton<string>
      ariaLabel={t('Granularity')}
      value={String(density)}
      label={
        granularityOptions.find((o) => o.key === density)?.label ?? t('Custom')
      }
      onChange={(v) => onDensityChange(Number(v))}
      options={granularityOptions.map((o) => ({
        value: String(o.key),
        label: t(o.label),
        disabled: o.disabled,
        hint: o.disabled
          ? t('The window is shorter than this bucket')
          : undefined,
      }))}
    />
  );
}

export function calculateGranularities(periodDurationMs: number) {
  const granularities = [
    { label: 'Hourly', durationMs: 60 * 60 * 1000, disabled: false },
    { label: 'Daily', durationMs: 24 * 60 * 60 * 1000, disabled: false },
    { label: 'Weekly', durationMs: 7 * 24 * 60 * 60 * 1000, disabled: false },
    { label: 'Monthly', durationMs: 30 * 24 * 60 * 60 * 1000, disabled: false },
    {
      label: 'Quarterly',
      durationMs: 3 * 30 * 24 * 60 * 60 * 1000,
      disabled: false,
    },
  ];

  const result: { label: string; key: number; disabled: boolean }[] = [];
  for (const granularity of granularities) {
    const density = Math.floor(
      Number(BigInt(periodDurationMs) / BigInt(granularity.durationMs)),
    );
    const disabled = periodDurationMs >= granularity.durationMs ? false : true;
    result.push({ label: granularity.label, key: density, disabled });
  }

  return result;
}

export default RangeGranularity;
