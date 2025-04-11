/* eslint-disable i18next/no-literal-string */
import { Button, Table, Divider } from 'antd';
import type { TableProps } from 'antd';

import { Eye, EyeOff } from 'lucide-react';
import cn from 'classnames';
import React, { useState } from 'react';
import { TableExporter } from 'Components/Funnels/FunnelWidget/FunnelTable';
import { useTranslation } from 'react-i18next';

const initTableProps = [
  {
    title: <span className="font-medium">Series</span>,
    _pureTitle: 'Series',
    dataIndex: 'seriesName',
    key: 'seriesName',
    sorter: (a, b) => a.seriesName.localeCompare(b.seriesName),
    fixed: 'left',
  },
  {
    title: <span className="font-medium">Avg.</span>,
    _pureTitle: 'Avg.',
    dataIndex: 'average',
    key: 'average',
    sorter: (a, b) => a.average - b.average,
    fixed: 'left',
  },
];

interface Props {
  data: { chart: any[]; namesMap: string[] };
  compData?: { chart: any[]; namesMap: string[] };
  enabledRows: string[];
  setEnabledRows: (rows: string[]) => void;
  defaultOpen?: boolean;
  metric: { name: string; viewType: string };
  inBuilder?: boolean;
  tableMode?: boolean;
}

function WidgetDatatable(props: Props) {
  const { t } = useTranslation();
  const [tableProps, setTableProps] =
    useState<TableProps['columns']>(initTableProps);
  const data = React.useMemo(() => {
    const dataObj = { ...props.data };
    if (props.compData) {
      dataObj.chart = dataObj.chart.map((item, i) => {
        const compItem = props.compData!.chart[i];
        const newItem = { ...item };
        if (!compItem) return newItem;
        Object.keys(compItem).forEach((key) => {
          if (key !== 'timestamp' && key !== 'time') {
            newItem[key] = compItem[key];
          }
        });
        return newItem;
      });
      const blank = new Array(dataObj.namesMap.length * 2).fill('');
      dataObj.namesMap = blank.map((_, i) =>
        i % 2 !== 0
          ? `Previous ${dataObj.namesMap[i / 2]}`
          : dataObj.namesMap[i / 2],
      );
    }
    return dataObj;
  }, [props.data, props.compData]);

  const [showTable, setShowTable] = useState(props.defaultOpen);
  const [tableData, setTableData] = useState([]);

  const columnNames = [];
  const series = !data.chart[0] ? [] : data.namesMap;

  React.useEffect(() => {
    if (!data.chart) return;
    setTableProps(initTableProps);
    columnNames.length = data.chart.length;
    // for example: mon, tue, wed, thu, fri, sat, sun
    data.chart.forEach((p: any, i) => {
      columnNames[i] = p.time;
    });

    // as many items (rows) as we have series in filter
    const items: Record<string, any>[] = [];
    series.forEach((s, i) => {
      items.push({ seriesName: s, average: 0, key: s });
    });
    const tableCols: {
      title: React.ReactNode;
      dataIndex: string;
      key: string;
      sorter: any;
    }[] = [];
    columnNames.forEach((name: string, i) => {
      tableCols.push({
        title: <span className="font-medium">{name}</span>,
        dataIndex: `${name}_${i}`,
        // @ts-ignore
        _pureTitle: name,
        key: `${name}_${i}`,
        sorter: (a, b) => a[`${name}_${i}`] - b[`${name}_${i}`],
      });
      const values = data.chart[i];
      series.forEach((s) => {
        const ind = items.findIndex((item) => item.seriesName === s);
        if (ind === -1) return;
        items[ind][`${name}_${i}`] = values[s];
      });
    });
    // calculating averages for each row
    items.forEach((item) => {
      const itemsLen = columnNames.length;
      const keys = Object.keys(item).filter(
        (k) => !['seriesName', 'key', 'average'].includes(k),
      );
      let sum = 0;
      const values = keys.map((k) => item[k]);
      values.forEach((v) => {
        sum += v;
      });
      item.average = (sum / itemsLen).toFixed(1);
    });

    setTableProps((prev) => [...prev, ...tableCols]);
    setTableData(items);
    props.setEnabledRows(data.namesMap);
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
        <div className="flex gap-2">
          <Divider
            style={{
              borderColor: showTable ? '#efefef' : 'transparent',
              borderStyle: 'dashed',
            }}
            variant="dashed"
          >
            <Button
              icon={showTable ? <EyeOff size={16} /> : <Eye size={16} />}
              size="small"
              type="default"
              onClick={() => setShowTable(!showTable)}
              className="btn-show-hide-table"
            >
              {showTable ? t('Hide Table') : t('Show Table')}
            </Button>
          </Divider>
        </div>
      )}

      {showTable || isTableOnlyMode ? (
        <div className="relative pb-2">
          <Table
            columns={tableProps}
            dataSource={tableData}
            pagination={false}
            rowSelection={props.tableMode ? undefined : rowSelection}
            size="small"
            scroll={{ x: 'max-content' }}
          />
          {props.inBuilder ? (
            <TableExporter
              tableData={tableData}
              tableColumns={tableProps}
              filename={props.metric.name}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default WidgetDatatable;
