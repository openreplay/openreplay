import { Segmented } from 'antd';
import React from 'react';

import ExCard from './ExCard';

function ExampleTrend() {
  const rows = [50, 40, 30, 20, 10];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

  const [isMulti, setIsMulti] = React.useState(false);
  return (
    <ExCard
      title={
        <div className={'flex items-center gap-2'}>
          <div>Trend</div>
          <Segmented
            options={[
              { label: 'Single-Series', value: 'single' },
              { label: 'Multi-Series', value: 'multi' },
            ]}
            onChange={(v) => setIsMulti(v === 'multi')}
          />
        </div>
      }
    >
      <div className={'relative'}>
        <div className={'flex flex-col gap-4'}>
          {rows.map((r) => (
            <div className={'flex items-center gap-2'}>
              <div className={'text-gray-dark'}>{r}K</div>
              <div className="border-t border-dotted border-gray-lighter w-full"></div>
            </div>
          ))}
        </div>
        <div className={'ml-4 flex items-center justify-around w-full'}>
          {months.map((m) => (
            <div className={'text-gray-dark'}>{m}</div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 50, left: 50 }}>
          <svg
            width="310"
            height="65"
            viewBox="0 0 310 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 55.3477L12.3778 48.184C23.7556 41.0204 46.5111 26.6931 69.2667 16.6138C92.0222 6.53442 114.778 0.703032 137.533 1.58821C160.289 2.47339 183.044 10.0751 205.8 18.5821C228.556 27.0891 251.311 36.5013 274.067 34.6878C296.822 32.8743 319.578 19.8351 342.333 12.8615C365.089 5.88789 387.844 4.97992 410.6 13.8627C433.356 22.7454 456.111 41.4189 478.867 51.0086C501.622 60.5983 524.378 61.1042 547.133 60.1189C569.889 59.1335 592.644 56.6569 615.4 51.4908C638.156 46.3247 660.911 38.4691 683.667 33.0755C706.422 27.6819 729.178 24.7502 751.933 18.4788C774.689 12.2073 797.444 2.59602 820.2 4.96937C842.956 7.34271 865.711 21.7007 888.467 24.9543C911.222 28.2078 933.978 20.357 956.733 24.9861C979.489 29.6152 1002.24 46.7243 1013.62 55.2788L1025 63.8333"
              stroke="#394EFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {isMulti ? (
          <div style={{ position: 'absolute', top: 50, left: 50 }}>
            <svg
              width="310"
              height="66"
              viewBox="0 0 310 66"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1028 60.5095L1016.64 55.3116C1005.28 50.1137 982.569 19.7179 959.854 12.4043C937.138 5.09082 914.423 0.85959 891.708 1.50187C868.992 2.14416 846.277 7.65995 823.561 13.8326C800.846 20.0052 778.131 46.8346 755.415 45.5188C732.7 44.2029 709.984 34.7417 687.269 29.6817C664.554 24.6217 641.838 23.9629 619.123 30.4082C596.407 36.8535 573.692 50.4029 550.977 57.3611C528.261 64.3193 505.546 64.6864 482.83 63.9714C460.115 63.2565 437.4 61.4595 414.684 57.711C391.969 53.9625 369.253 48.2625 346.538 44.3489C323.823 40.4353 301.107 38.3081 278.392 33.7576C255.676 29.207 232.961 22.2331 210.246 23.9552C187.53 25.6773 164.815 36.0954 142.099 38.4562C119.384 40.8169 96.6686 35.1204 73.9532 38.4793C51.2378 41.8381 16.7156 44.2524 5.35794 50.4595L-5.99987 56.6666"
                stroke="#24959A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : null}
      </div>
      <div className={'flex gap-4 justify-center'}>
        <div className={'flex gap-2 items-center'}>
          <div className={'w-4 h-4 rounded-full bg-main'} />
          <div>CTA 1</div>
        </div>
        <div className={'flex gap-2 items-center'}>
          <div className={'w-4 h-4 rounded-full bg-tealx'} />
          <div>CTA 2</div>
        </div>
      </div>
    </ExCard>
  );
}

export default ExampleTrend;
