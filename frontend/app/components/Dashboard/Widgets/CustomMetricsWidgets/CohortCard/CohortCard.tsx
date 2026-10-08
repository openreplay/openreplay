import React from 'react';
import { useTranslation } from 'react-i18next';

import './cohort.css';

interface Props {
  data: any;
}
function CohortCard(props: Props) {
  const { t } = useTranslation();
  // const { data } = props;
  const data = [
    {
      cohort: '2022-01-01',
      users: 100,
      data: [
        100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
        10, 5,
      ],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [
        100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
      ],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [
        100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
      ],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    {
      cohort: '2022-01-08',
      users: 100,
      data: [90, 70, 50, 30],
    },
    // ... more rows
  ];

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
