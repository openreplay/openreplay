import { GitCommitHorizontal } from 'lucide-react';
import React from 'react';

import ExCard from './ExCard';
import { useTranslation } from 'react-i18next';

function PerfBreakdown(props: any) {
  const { t } = useTranslation();
  const rows = [
    ['5K', '1K'],
    ['4K', '750'],
    ['3K', '500'],
    ['2K', '250'],
    ['1K', '0'],
  ];
  const months = [t('Jan'), t('Feb'), t('Mar'), t('Apr'), t('May')];
  const values = [
    [3, 1, 9],
    [2, 4, 10],
    [3, 6, 2],
    [7, 4, 1],
    [5, 3, 4],
  ];
  const bgs = ['#E2E4F6', '#A7BFFF', '#394EFF'];
  return (
    <ExCard {...props}>
      <div className="relative">
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div className="flex items-center gap-2">
              <div className="text-gray-dark">{r[0]}</div>
              <div className="border-t border-dotted border-gray-lighter w-full" />
              <div className="text-gray-dark min-w-8">{r[1]}</div>
            </div>
          ))}
        </div>
        <div className="px-4 flex items-center justify-around w-full">
          {months.map((m, i) => (
            <div className="text-gray-dark relative">
              <span>{m}</span>
              <div
                className="absolute flex flex-col"
                style={{ bottom: 30, left: 0, width: 24 }}
              >
                {values[i].map((v, bg) => (
                  <div
                    style={{
                      width: '100%',
                      height: `${v * 9}px`,
                      background: bgs[bg],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            zIndex: 99,
            width: 308,
            overflow: 'hidden',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="332"
            height="37"
            viewBox="0 0 332 37"
            fill="none"
          >
            <path
              d="M1 30.8715L4.66667 26.964C8.33333 23.0566 15.6667 15.2417 23 9.74387C30.3333 4.24605 37.6667 1.06529 45 1.54812C52.3333 2.03094 59.6667 6.17735 67 10.8175C74.3333 15.4577 81.6667 20.5916 89 19.6024C96.3333 18.6133 103.667 11.5009 111 7.69717C118.333 3.89339 125.667 3.39814 133 8.24328C140.333 13.0884 147.667 23.274 155 28.5047C162.333 33.7354 169.667 34.0114 177 33.4739C184.333 32.9365 191.667 31.5856 199 28.7677C206.333 25.9499 213.667 21.665 221 18.723C228.333 15.781 235.667 14.182 243 10.7612C250.333 7.34035 257.667 2.09783 265 3.39238C272.333 4.68693 279.667 12.5186 287 14.2932C294.333 16.0679 301.667 11.7856 309 14.3106C316.333 16.8356 323.667 26.1678 327.333 30.8339L331 35.5"
              stroke="#6A8CFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <div className="flex gap-2 items-center">
          <div className="w-4 h-4 rounded-full bg-[#E2E4F6]" />
          <div className="text-disabled-text">{t('XHR')}</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-4 h-4 rounded-full bg-[#A7BFFF]" />
          <div className="text-disabled-text">{t('Other')}</div>
        </div>
        <div className="flex gap-2 items-center">
          <GitCommitHorizontal size={14} strokeWidth={1} color="#6A8CFF" />
          <div className="text-disabled-text">{t('Response End')}</div>
        </div>
      </div>
    </ExCard>
  );
}

export default PerfBreakdown;
