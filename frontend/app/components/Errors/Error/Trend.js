import React from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import domain from 'Components/Dashboard/Widgets/common/domain';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

function CustomTooltip({ active, payload, label, timeFormat = 'hh:mm a' }) {
  const { t } = useTranslation();
  if (active) {
    const p = payload[0].payload;
    const dateStr = DateTime.fromMillis(p.timestamp).toFormat(timeFormat);
    return (
      <div className="rounded border bg-white p-2">
        <p className="label text-sm color-gray-medium">{dateStr}</p>
        <p className="text-sm">
          {t('Sessions:')}
          {p.count}
        </p>
      </div>
    );
  }

  return null;
}

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
      <ResponsiveContainer height={100} width="100%">
        <BarChart data={chart} margin={0}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A8E0DA" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#A8E0DA" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ fill: '#ddd' }}
            content={<CustomTooltip timeFormat={timeFormat} />}
          />
          <XAxis
            interval={0}
            dataKey="time"
            // tick={ { fill: '#999999', fontSize: 9 } }
            // tickLine = {{ stroke: '#CCCCCC' }}
            strokeWidth={0}
            hide
          />
          <YAxis hide interval={0} domain={domain} />
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#EEEEEE"
          />
          <Bar
            name={t('Sessions')}
            type="monotone"
            dataKey="count"
            // stroke="#3EAAAF"
            minPointSize={1}
            fillOpacity={1}
            // strokeWidth={ 1 }
            // strokeOpacity={ 0.8 }
            fill="#3EAAAF"
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

Trend.displayName = 'Trend';
export default Trend;
