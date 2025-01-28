import React from 'react';
import { Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import Widget from 'App/mstore/types/widget';
import Funnel from 'App/mstore/types/funnel';
import { ItemMenu } from 'UI';
import { EllipsisVertical, FileDown } from 'lucide-react';
import { exportAntCsv } from '../../../utils';

interface Props {
  metric?: Widget;
  data: { funnel: Funnel };
  compData: { funnel: Funnel };
}

function FunnelTable(props: Props) {
  const tableData = [
    {
      conversion: props.data.funnel.totalConversionsPercentage,
    },
  ];
  const tableProps: TableProps['columns'] = [
    {
      title: 'Conversion %',
      dataIndex: 'conversion',
      key: 'conversion',
      fixed: 'left',
      width: 140,
      render: (text: string, _, index) => (
        <div className={'w-full justify-between flex'}>
          <div>Overall {index > 0 ? '(previous)' : ''}</div>
          <div>{text}%</div>
        </div>
      ),
    },
  ];

  React.useEffect(() => {
    const funnel = props.data.funnel;
    funnel.stages.forEach((st, ind) => {
      const title = `${st.label} ${st.operator} ${st.value.join(' or ')}`;
      const wrappedTitle =
        title.length > 40 ? title.slice(0, 40) + '...' : title;
      tableProps.push({
        title: wrappedTitle,
        dataIndex: 'st_' + ind,
        key: 'st_' + ind,
        ellipsis: true,
        width: 120,
      });
      tableData[0]['st_' + ind] = st.count;
    });
    if (props.compData) {
      tableData.push({
        conversion: props.compData.funnel.totalConversionsPercentage,
      });
      const compFunnel = props.compData.funnel;
      compFunnel.stages.forEach((st, ind) => {
        tableData[1]['st_' + ind] = st.count;
      });
    }
  }, [props.data]);

  return (
    <div className={'-mx-4 px-2'}>
      <div className={'mt-2 relative'}>
        <Table
          bordered
          columns={tableProps}
          dataSource={tableData}
          pagination={false}
          size={'middle'}
          scroll={{ x: 'max-content' }}
          rowClassName={(_, index) => (index > 0 ? 'opacity-70' : '')}
        />
        <TableExporter
          tableColumns={tableProps}
          tableData={tableData}
          filename={props.metric?.name || 'funnel'}
          top={'top-1'}
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
  const onClick = () => exportAntCsv(tableColumns, tableData, filename);
  return (
    <div
      className={`absolute ${top ? top : 'top-0'} ${
        right ? right : '-right-1'
      }`}
    >
      <ItemMenu
        items={[{ icon: 'download', text: 'Export to CSV', onClick }]}
        bold
        customTrigger={
          <div
            className={
              'flex items-center justify-center bg-gradient-to-r from-[#fafafa] to-neutral-200 cursor-pointer rounded-lg h-[38px]	w-[38px] btn-export-table-data'
            }
          >
            <EllipsisVertical size={16} />
          </div>
        }
      />
    </div>
  );
}

export default FunnelTable;
