import React, { useState } from 'react';
import { formatTimeOrDate } from 'App/date';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';

import { Eye, EyeOff } from 'lucide-react';
import { Styles } from '../../common';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface Props {
  data: any;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}

const initTableProps = [{
  title: 'Series',
  dataIndex: 'seriesName',
  key: 'seriesName',
},
  {
    title: 'Avg.',
    dataIndex: 'average',
    key: 'average',
  }
]

function CustomMetricLineChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
  } = props;
  const [showTable, setShowTable] = useState(false);
  const hasMultipleSeries = data.namesMap.length > 1;
  const [tableData, setTableData] = useState([]);
  const [tableProps, setTableProps] = useState<TableProps['columns']>(initTableProps);
  // console.log(params.density / 7, data.chart)

  const columnNames = new Set();
  /**
   * basically we have an array of
   * { time: some_date, series1: 1, series2: 2, series3: 3, timestamp: 123456 }
   * which we turn into a table where each series of filters = row;
   * and each unique time = column
   * + average for each row
   * [ { seriesName: 'series1', mon: 1, tue: 2, wed: 3, average: 2 }, ... ]
   * */
  React.useEffect(()=> {
    setTableProps(initTableProps)
    const series = Object.keys(data.chart[0])
      .filter((key) => key !== 'time' && key !== 'timestamp')
    columnNames.clear()
    data.chart.forEach((p: any) => {
      columnNames.add(p.time)
    }) // for example: mon, tue, wed, thu, fri, sat, sun
    const avg: any = {} // { seriesName: {itemsCount: 0, total: 0} }
    const items: Record<string, any>[] = []; // as many items (rows) as we have series in filter
    series.forEach(s => {
      items.push({ seriesName: s, average: 0 })
      avg[s] = { itemsCount: 0, total: 0 }
    })
    const tableCols: { title: string, dataIndex: string, key: string }[] = [];
    Array.from(columnNames).forEach((name: string) => {
      tableCols.push({
        title: name,
        dataIndex: name,
        key: name,
      })
      const values = data.chart.filter((p) => p.time === name)
      series.forEach((s) => {
        const toDateAvg = values.reduce((acc, curr) => acc + curr[s], 0) / values.length;
        avg[s].itemsCount += 1
        avg[s].total += toDateAvg
        const ind = items.findIndex((item) => item.seriesName === s)
        if (ind === -1) return
        items[ind][name] = (values.reduce((acc, curr) => acc + curr[s], 0) / values.length)
          .toFixed(2)
      })
    })
    Object.keys(avg).forEach((key) => {
      const ind = items.findIndex((item) => item.seriesName === key)
      if (ind === -1) return
      items[ind].average = (avg[key].total / avg[key].itemsCount).toFixed(2)
    })

    setTableProps((prev) => [...prev, ...tableCols])
    setTableData(items)
  }, [data.chart.length])

  return (
    <div>
      <ResponsiveContainer height={240} width="100%">
        <LineChart
          data={data.chart}
          margin={Styles.chartMargins}
          onClick={onClick}
        >
          {!hideLegend && (
            <Legend iconType={'circle'} wrapperStyle={{ top: -26 }} />
          )}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#EEEEEE"
          />
          <XAxis
            {...Styles.xaxis}
            dataKey="time"
            interval={params.density / 7}
          />
          <YAxis
            {...yaxis}
            allowDecimals={false}
            tickFormatter={(val) => Styles.tickFormatter(val)}
            label={{
              ...Styles.axisLabelLeft,
              value: label || 'Number of Sessions',
            }}
          />
          <Tooltip {...Styles.tooltip} content={CustomTooltip} />
          {Array.isArray(data.namesMap) &&
            data.namesMap.map((key, index) => (
              <Line
                key={key}
                name={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index]}
                fillOpacity={1}
                strokeWidth={2}
                strokeOpacity={key === 'Total' ? 0 : 0.6}
                legendType={key === 'Total' ? 'none' : 'line'}
                dot={false}
                // strokeDasharray={'4 3'} FOR COPMARISON ONLY
                activeDot={{
                  fill: key === 'Total' ? 'transparent' : colors[index],
                }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
      {hasMultipleSeries ? (
        <div className={'relative -mx-4 px-4'}>
          <div
            className={
              'absolute left-0 right-0 top-0 border-t border-t-gray-lighter'
            }
          />
          <div className={'absolute top-0 left-1/2 z-10'} style={{ transform: 'translate(-50%, -50%)' }}>
            <Button
              icon={showTable ? <EyeOff size={16} /> : <Eye size={16} />}
              size={'small'}
              type={'default'}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'Show Table'}
            </Button>
          </div>
          {showTable ? (
            <Table
              columns={tableProps}
              dataSource={tableData}
              pagination={false}
              size={'small'}
              className={'py-6'}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active) return;

  const shownPayloads = payload.filter((p) => !p.hide);
  return (
    <div className={'flex flex-col gap-1 bg-white shadow border rounded p-2'}>
      {shownPayloads.map((p, index) => (
        <>
          <div className={'flex gap-2 items-center'}>
            <div
              style={{ borderRadius: 99, background: p.color }}
              className={'h-5 w-5 flex items-center justify-center'}
            >
              <div className={'invert text-sm'}>{index + 1}</div>
            </div>
            <div className={'font-semibold'}>{p.name}</div>
          </div>
          <div
            style={{ borderLeft: `2px solid ${p.color}` }}
            className={'flex flex-col py-2 px-2 ml-2'}
          >
            <div className={'text-disabled-text text-sm'}>
              {label}, {formatTimeOrDate(p.payload.timestamp)}
            </div>
            <div className={'font-semibold'}>{p.value}</div>
          </div>
        </>
      ))}
    </div>
  );
}

export default CustomMetricLineChart;
