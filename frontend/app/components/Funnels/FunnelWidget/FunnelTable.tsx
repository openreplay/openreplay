import React from 'react';
import { Table, Dropdown } from 'antd';
import type { TableProps } from 'antd';
import Widget from 'App/mstore/types/widget';
import Funnel from 'App/mstore/types/funnel';
import { EllipsisVertical } from 'lucide-react';
import { exportAntCsv } from 'App/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  metric?: Widget;
  data: { funnel: Funnel };
  compData: { funnel: Funnel };
}

function FunnelTable(props: Props) {
  const { t } = useTranslation();
  const defaultTableProps: TableProps['columns'] = [
    {
      title: 'Conversion %',
      dataIndex: 'conversion',
      key: 'conversion',
      fixed: 'left',
      width: 140,
      render: (text: string, _, index) => (
        <div className="w-full justify-between flex">
          <div>
            {t('Overall')}
            {index > 0 ? `(${t('previous')})` : ''}
          </div>
          <div>{text}%</div>
        </div>
      ),
    },
  ];
  const defaultData = [
    {
      conversion: props.data.funnel.totalConversionsPercentage,
    },
  ];
  const [tableProps, setTableProps] = React.useState(defaultTableProps);
  const [tableData, setTableData] = React.useState(defaultData);

  const joinWithOr = (vals: any[]) =>
    (vals || []).map((v) => String(v)).join(` ${t('or')} `);

  const buildStageTitle = (st: any) => {
    const hasSubs = Array.isArray(st.subfilters) && st.subfilters.length > 0;
    if (hasSubs) {
      const parts: string[] = [];
      st.subfilters.forEach((sf: any, idx: number) => {
        parts.push(`${sf.name} ${sf.operator} ${joinWithOr(sf.value)}`);
        if (idx < st.subfilters.length - 1) {
          parts.push(sf.propertyOrder || 'and');
        }
      });
      return `${st.label} where ${parts.join(' ')}`;
    }
    return `${st.label} ${st.operator} ${joinWithOr(st.value)}`;
  };

  React.useEffect(() => {
    const { funnel } = props.data;
    const tablePropsCopy = [...defaultTableProps];
    const tableDataCopy: any[] = [ { ...defaultData[0] } ];

    const colsAmount = funnel.stages.length + 1;
    const colSize = Math.round(100 / colsAmount);
    funnel.stages.forEach((st: any, ind: number) => {
      const title = buildStageTitle(st);
      const className = `w-${colSize} max-w-[500px] overflow-hidden text-ellipsis`
      tablePropsCopy.push({
        title: <div className={className}>{title}</div>,
        dataIndex: `st_${ind}`,
        key: `st_${ind}`,
        ellipsis: true,
        width: 120,
      });
      tableDataCopy[0][`st_${ind}`] = st.count;
    });

    if (props.compData) {
      tableDataCopy.push({
        conversion: props.compData.funnel.totalConversionsPercentage,
      });
      const compFunnel = props.compData.funnel;
      compFunnel.stages.forEach((st: any, ind: number) => {
        tableDataCopy[1][`st_${ind}`] = st.count;
      });
    }
    setTableProps(tablePropsCopy);
    setTableData(tableDataCopy);
  }, [props.data, props.compData, t]);

  return (
    <div className="-mx-4 px-2">
      <div className="mt-2 relative">
        <Table
          bordered
          columns={tableProps}
          dataSource={tableData}
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
          rowClassName={(_, index) => (index > 0 ? 'opacity-70' : '')}
        />
        <TableExporter
          tableColumns={tableProps}
          tableData={tableData}
          filename={props.metric?.name || 'funnel'}
          top="top-1"
        />
      </div>
    </div>
  );
}

export function TableExporter({
  tableData,
  tableColumns,
  filename,
  top,
  right,
}: {
  tableData: any;
  tableColumns: any;
  filename: string;
  top?: string;
  right?: string;
}) {
  const { t } = useTranslation();
  const onClick = () => exportAntCsv(tableColumns, tableData, filename);
  return (
    <div
      className={`absolute ${top || 'top-0'} ${right || '-right-1'}`}
      style={{ zIndex: 10 }}
    >
      <Dropdown
        menu={{
          items: [{ key: 'download', label: 'Export to CSV', onClick }],
        }}
      >
        <div className="flex items-center justify-center bg-gray-lighter cursor-pointer rounded-lg h-[38px]	w-[38px] btn-export-table-data">
          <EllipsisVertical size={16} />
        </div>
      </Dropdown>
    </div>
  );
}

export default FunnelTable;
