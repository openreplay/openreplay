import { Button, Table } from 'antd';
import type { TableProps } from 'antd';

import { Eye, EyeOff } from 'lucide-react';
import cn from 'classnames';
import React, { useState } from 'react';

const initTableProps = [
  {
    title: 'Series',
    dataIndex: 'seriesName',
    key: 'seriesName',
    sorter: (a, b) => a.seriesName.localeCompare(b.seriesName),
  },
  {
    title: 'Avg.',
    dataIndex: 'average',
    key: 'average',
    sorter: (a, b) => a.average - b.average,
  },
];

interface Props {
  data: { chart: any[]; namesMap: string[] };
  enabledRows: string[];
  setEnabledRows: (rows: string[]) => void;
}

function WidgetDatatable(props: Props) {
  const [tableProps, setTableProps] =
    useState<TableProps['columns']>(initTableProps);
  // console.log(params.density / 7, data.chart)
  const data = props.data;

  const [showTable, setShowTable] = useState(false);
  const hasMultipleSeries = data.namesMap.length > 1;
  const [tableData, setTableData] = useState([]);

  const columnNames = new Set();
  /**
   * basically we have an array of
   * { time: some_date, series1: 1, series2: 2, series3: 3, timestamp: 123456 }
   * which we turn into a table where each series of filters = row;
   * and each unique time = column
   * + average for each row
   * [ { seriesName: 'series1', mon: 1, tue: 2, wed: 3, average: 2 }, ... ]
   * */
  const series = Object.keys(data.chart[0]).filter(
    (key) => key !== 'time' && key !== 'timestamp'
  );
  React.useEffect(() => {
    setTableProps(initTableProps);
    columnNames.clear();
    data.chart.forEach((p: any) => {
      columnNames.add(p.time);
    }); // for example: mon, tue, wed, thu, fri, sat, sun
    const avg: any = {}; // { seriesName: {itemsCount: 0, total: 0} }
    const items: Record<string, any>[] = []; // as many items (rows) as we have series in filter
    series.forEach((s, i) => {
      items.push({ seriesName: s, average: 0, key: s });
      avg[s] = { itemsCount: 0, total: 0 };
    });
    const tableCols: {
      title: string;
      dataIndex: string;
      key: string;
      sorter: any;
    }[] = [];
    const uniqueColArr = Array.from(columnNames);
    uniqueColArr.forEach((name: string, i) => {
      tableCols.push({
        title: name,
        dataIndex: name,
        key: name,
        sorter: (a, b) => a[name] - b[name],
      });
      const values = data.chart.filter((p) => p.time === name);
      series.forEach((s) => {
        avg[s].itemsCount += 1;
        avg[s].total += values.reduce((acc, curr) => acc + curr[s], 0);
        const ind = items.findIndex((item) => item.seriesName === s);
        if (ind === -1) return;
        items[ind][name] = values.reduce((acc, curr) => acc + curr[s], 0);
      });
    });
    Object.keys(avg).forEach((key) => {
      const ind = items.findIndex((item) => item.seriesName === key);
      if (ind === -1) return;
      items[ind].average = (avg[key].total / avg[key].itemsCount).toFixed(2);
    });

    setTableProps((prev) => [...prev, ...tableCols]);
    setTableData(items);
  }, [data.chart.length]);

  const rowSelection: TableProps['rowSelection'] = {
    selectedRowKeys: props.enabledRows,
    onChange: (selectedRowKeys: React.Key[]) => {
      props.setEnabledRows(selectedRowKeys as string[]);
    },
    getCheckboxProps: (record: any) => ({
      name: record.name,
      checked: false,
    }),
    type: 'checkbox',
  };
  return hasMultipleSeries ? (
    <div className={cn('relative -mx-4 px-2', showTable ? 'pt-6' : '')}>
      <div
        className={
          'absolute left-0 right-0 top-0 border-t border-t-gray-lighter'
        }
      />
      <div
        className={'absolute top-0 left-1/2 z-10'}
        style={{ transform: 'translate(-50%, -50%)' }}
      >
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
        <div className={'relative pb-2'}>
          <Table
            columns={tableProps}
            dataSource={tableData}
            pagination={false}
            rowSelection={rowSelection}
            size={'small'}
          />
          {/* 1.23+ export menu floater */}
          {/*<div className={'absolute top-0 -right-1'}>*/}
          {/*  <ItemMenu*/}
          {/*    items={[*/}
          {/*      { icon: 'pencil', text: 'Rename', onClick: () => null },*/}
          {/*    ]}*/}
          {/*    bold*/}
          {/*    customTrigger={*/}
          {/*    <div className={'flex items-center justify-center bg-gray-lighter cursor-pointer hover:bg-gray-light'} style={{ height: 38, width: 38, boxShadow: '-2px 0px 3px 0px rgba(0, 0, 0, 0.05)' }}>*/}
          {/*      <EllipsisVertical size={16} />*/}
          {/*    </div>*/}
          {/*  }*/}
          {/*  />*/}
          {/*</div>*/}
        </div>
      ) : null}
    </div>
  ) : null;
}

export default WidgetDatatable;
