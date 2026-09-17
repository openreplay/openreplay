import React from 'react';
import Sparkline from 'Components/Charts/Sparkline';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

function Trend({ title = '', chart, onDateChange, timeFormat = 'hh:mm a' }) {
  const { t } = useTranslation();
  if (!Array.isArray(chart)) return null;

  const getDateFormat = (val) => {
    const d = new Date(val);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <>
      <div className="flex justify-between">
        <h4 className="font-medium">{title}</h4>
        {/* <DateRangeDropdown
	        button
					onChange={ onDateChange }
					direction="left"
          customHidden
	      /> */}
      </div>
      <Sparkline
        data={chart}
        valueKey="count"
        name={t('Sessions')}
        color="#3EAAAF"
        height={100}
        tooltipFormatter={(row) =>
          `<div class="text-sm color-gray-medium">${DateTime.fromMillis(
            row.timestamp,
          ).toFormat(timeFormat)}</div><div class="text-sm">${t(
            'Sessions:',
          )}${row.count}</div>`
        }
      />
    </>
  );
}

Trend.displayName = 'Trend';
export default Trend;
