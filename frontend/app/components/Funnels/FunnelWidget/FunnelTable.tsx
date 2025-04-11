import React from 'react';
import { Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import Widget from 'App/mstore/types/widget';
import Funnel from 'App/mstore/types/funnel';
import { ItemMenu } from 'UI';
import { EllipsisVertical } from 'lucide-react';
import { exportAntCsv } from '../../../utils';
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

  React.useEffect(() => {
    const { funnel } = props.data;
    const tablePropsCopy = defaultTableProps;
    const tableDataCopy = defaultData;
    funnel.stages.forEach((st, ind) => {
      const title = `${st.label} ${st.operator} ${st.value.join(' or ')}`;
      const wrappedTitle =
        title.length > 40 ? `${title.slice(0, 40)}...` : title;
      tablePropsCopy.push({
        title: wrappedTitle,
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
      compFunnel.stages.forEach((st, ind) => {
        tableDataCopy[1][`st_${ind}`] = st.count;
      });
    }
    setTableProps(tablePropsCopy);
    setTableData(tableDataCopy);
  }, [props.data]);

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
    <Tooltip title={t('Export Data to CSV')}>
      <div className={`absolute ${top || 'top-0'} ${right || '-right-1'}`}>
        <ItemMenu
          items={[{ icon: 'download', text: 'Export to CSV', onClick }]}
          bold
          customTrigger={
            <div className="flex items-center justify-center bg-gradient-to-r from-[#fafafa] to-neutral-200 cursor-pointer rounded-lg h-[38px]	w-[38px] btn-export-table-data">
              <EllipsisVertical size={16} />
            </div>
          }
        />
      </div>
    </Tooltip>
  );
}

export default FunnelTable;
