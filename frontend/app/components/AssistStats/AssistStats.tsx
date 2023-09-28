import React from 'react';
import { Button, Typography, Input } from 'antd';
import { FilePdfOutlined, } from '@ant-design/icons';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import TeamMembers from "Components/AssistStats/components/TeamMembers";

import Chart from './components/Charts';
import Table from './components/Table';

const { Search } = Input;

const fakeData = {
  chart: [
    {
      // time: 'Wed',
      value: 10,
      timestamp: 1695168000000,
    },
    {
      // time: 'Thu',
      value: 4.999194847020934,
      timestamp: 1695268484000,
    },
    {
      // time: 'Fri',
      value: 6.515267175572519,
      timestamp: 1695383683000,
    },
    {
      // time: 'Sat',
      value: 5.776388888888889,
      timestamp: 1695498882000,
    },
    {
      // time: 'Mon',
      value: 8.078485181119648,
      timestamp: 1695614081000,
    },
    {
      // time: 'Tue',
      value: 10.787750151607035,
      timestamp: 1695729280000,
    },
    {
      // time: 'Tue',
      value: 15,
      timestamp: 1695760456285,
    },
  ],
};
const Charts = [
  'Avg Live Duration',
  'Avg Call Duration',
  'Avg Remote Duration',
  'Total Live Duration',
  'Total Call Duration',
  'Total Remote Duration',
];

function AssistStats() {
  const [period, setPeriod] = React.useState<any>(Period({ rangeName: LAST_24_HOURS }));

  const onChangePeriod = (period: any) => {
    setPeriod(period);
  };
  return (
    <div className={'w-full'}>
      <div className={'w-full flex items-center mb-2'}>
        <Typography.Title style={{ marginBottom: 0 }} level={4}>
          Assist Stats
        </Typography.Title>
        <div className={'ml-auto flex items-center gap-2'}>
          <Search
            placeholder="input search text"
            allowClear
            size={'small'}
            classNames={{ input: '!border-0 focus:!border-0' }}
            onSearch={() => null}
            style={{ width: 200 }}
          />

          <SelectDateRange period={period} onChange={onChangePeriod} right={true} isAnt />
          <Button shape={'default'} size={'small'} icon={<FilePdfOutlined rev={undefined} />} />
        </div>
      </div>
      <div className={'w-full grid grid-cols-3 gap-2'}>
        <div className={'grid grid-cols-3 gap-2 flex-2 col-span-2'}>
          {Charts.map((i) => (
            <div className={'bg-white rounded border'}>
              <div className={'pt-2 px-2'}>
                <Typography.Title style={{ marginBottom: 0 }} level={5}>
                  {i}
                </Typography.Title>
                <div className={'flex gap-1 items-center'}>
                  <Typography.Title style={{ marginBottom: 0 }} level={5}>
                    132
                  </Typography.Title>
                  <Typography.Text>hrs</Typography.Text>
                </div>
              </div>
              <Chart data={randomizeData(fakeData)} label={'Test'} />
            </div>
          ))}
        </div>
        <div className={'flex-1 col-span-1'}>
          <TeamMembers />
        </div>
      </div>
      <div className={'w-full mt-2'}>
        <Table onSort={() => null} />
      </div>
    </div>
  );
}

export default AssistStats;

function randomizeData(inputData) {
  const newData = JSON.parse(JSON.stringify(inputData));
  newData.chart = newData.chart.map((entry) => {
    // Randomize the value field
    const randomFactor = Math.random() * 2 - 1;
    const variance = entry.value * 1.5;
    entry.value += randomFactor * variance;

    if (entry.value < 0) {
      entry.value = 0;
    }

    return entry;
  });

  return newData;
}
