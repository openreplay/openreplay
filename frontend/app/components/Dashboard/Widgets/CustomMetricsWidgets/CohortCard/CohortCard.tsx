import React from 'react';
import { useTranslation } from 'react-i18next';

import './cohort.css';

interface Props {
  data: any;
}
function CohortCard(props: Props) {
  const { t } = useTranslation();
  // rows of { cohort, users, data: retention % per week }
  const data: { cohort: string; users: number; data: number[] }[] =
    Array.isArray(props.data) && Array.isArray(props.data[0]?.data)
      ? props.data
      : [];
  if (!data.length) return null;

  return (
    <div className="m-cohort">
      <table className="m-cohort__table">
        <thead>
          <tr>
            <th className="is-fixed">{t('Date')}</th>
            <th className="is-fixed">{t('Users')}</th>
            <th colSpan={data[0].data.length} className="m-cohort__span">
              {t('Weeks later users retained')}
            </th>
          </tr>
          <tr>
            <th className="is-fixed" />
            <th className="is-fixed" />
            {data[0].data.map((_, index) => (
              <th key={`header-${index}`}>{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <td className="is-fixed">{row.cohort}</td>
              <td className="is-fixed tabular-nums">{row.users}</td>
              {row.data.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="m-cohort__cell"
                  style={{
                    background: `color-mix(in srgb, var(--m-chart-1) ${Math.round(cell / 2)}%, transparent)`,
                  }}
                >
                  {cell}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CohortCard;
