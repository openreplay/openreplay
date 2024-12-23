import { Button, Table, Divider } from 'antd';
import type { TableProps } from 'antd';

import { Eye, EyeOff } from 'lucide-react';
import cn from 'classnames';
import React, { useState } from 'react';
import { TableExporter } from '../../../Funnels/FunnelWidget/FunnelTable';

const initTableProps = [
  {
    title: <span className="font-medium">Series</span>,
    dataIndex: 'seriesName',
    key: 'seriesName',
    sorter: (a, b) => a.seriesName.localeCompare(b.seriesName),
    fixed: 'left',
  },
  {
    title: <span className="font-medium">Avg.</span>,
    dataIndex: 'average',
    key: 'average',
    sorter: (a, b) => a.average - b.average,
    fixed: 'left',
  },
];

interface Props {
  data: { chart: any[]; namesMap: string[] };
  enabledRows: string[];
  setEnabledRows: (rows: string[]) => void;
  defaultOpen?: boolean;
  metric: { name: string; viewType: string };
}

function WidgetDatatable(props: Props) {
  const [tableProps, setTableProps] =
    useState<TableProps['columns']>(initTableProps);
  const data = props.data;

  const [showTable, setShowTable] = useState(props.defaultOpen);
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
  const series = !data.chart[0]
    ? []
    : Object.keys(data.chart[0]).filter(
        (key) => key !== 'time' && key !== 'timestamp'
      );
  React.useEffect(() => {
    if (!data.chart) return;
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
      title: React.ReactNode;
      dataIndex: string;
      key: string;
      sorter: any;
    }[] = [];
    const uniqueColArr = Array.from(columnNames);
    uniqueColArr.forEach((name: string, i) => {
      tableCols.push({
        title: <span className={'font-medium'}>{name}</span>,
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
  }, [data.chart]);

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

  const isTableOnlyMode = props.metric.viewType === 'table';

  return (
    <div className={cn('relative -mx-4 px-2', showTable ? '' : '')}>
      {!isTableOnlyMode && (
        <div className='flex gap-2'>
          <Divider style={{ borderColor: showTable ? '#efefef' : 'transparent', borderStyle:  'dashed'}} variant="dashed">
            <Button
              icon={showTable ? <EyeOff size={16} /> : <Eye size={16} />}
              size={'small'}
              type={'default'}
              onClick={() => setShowTable(!showTable)}
              className='btn-show-hide-table'
            >
              {showTable ? 'Hide Table' : 'Show Table'}
            </Button>
          </Divider>
        </div>
      )}

      {(showTable || isTableOnlyMode) ? (
        <div className={'relative pb-2'}>
          <Table
            columns={tableProps}
            dataSource={tableData}
            pagination={false}
            rowSelection={rowSelection}
            size={'small'}
            scroll={{ x: 'max-content' }}
          />
          <TableExporter
            tableData={tableData}
            tableColumns={tableProps}
            filename={props.metric.name}
          />
        </div>
      ) : null}
    </div>
  );
}

export default WidgetDatatable;
