import React from 'react';
import { numberWithCommas } from 'App/utils';
import { useTranslation } from 'react-i18next';

function TooltipLabel({ payload, unit = false }) {
  const { t } = useTranslation();
  if (!payload) return '';
  const value = numberWithCommas(Math.round(payload.value));
  return (
    <div className="text-sm">
      {`${payload.name}: ${value}`}
      {unit && <span className="ml-1 text-xs">{t('ms')}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }) {
  if (active && payload && payload[0]) {
    return (
      <div className="border rounded p-2 bg-white leading-5">
        <div className="text-xs color-gray-medium">{`${label}`}</div>
        {payload.map((p) => (
          <TooltipLabel payload={p} unit={unit} />
        ))}
      </div>
    );
  }

  return null;
}

export default CustomTooltip;
