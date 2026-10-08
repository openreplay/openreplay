import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { type Column, DataTable } from '@/ui/data/table';
import { EllipsisVertical } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Funnel from 'App/mstore/types/funnel';
import Widget from 'App/mstore/types/widget';
import { exportAntCsv } from 'App/utils';

interface Props {
  metric?: Widget;
  data: { funnel: Funnel };
  compData: { funnel: Funnel };
}

function FunnelTable(props: Props) {
  const { t } = useTranslation();
  /* antd-shaped column specs: `exportAntCsv` reads `dataIndex` / `_pureTitle` */
  const defaultTableProps: Record<string, any>[] = [
    {
      title: 'Conversion %',
      _pureTitle: 'Conversion %',
      dataIndex: 'conversion',
      key: 'conversion',
      width: 140,
      render: (text: string, _: any, index: number) => (
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
  const [tableData, setTableData] =
    React.useState<Record<string, any>[]>(defaultData);

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
    const tableDataCopy: any[] = [{ ...defaultData[0] }];

    funnel.stages.forEach((st: any, ind: number) => {
      const title = buildStageTitle(st);
      tablePropsCopy.push({
        title: (
          <div className="max-w-[500px] overflow-hidden text-ellipsis">
            {title}
          </div>
        ),
        _pureTitle: title,
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

  const columns: Column<Record<string, any>>[] = tableProps.map((c) => ({
    title: c.title,
    key: c.key,
    width: c.width,
    render: (row, i) =>
      c.render ? c.render(row[c.dataIndex], row, i) : row[c.dataIndex],
  }));

  return (
    <div className="-mx-4 px-2">
      <div className="mt-2 relative">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 140 + (tableProps.length - 1) * 140 }}>
            <DataTable<Record<string, any>>
              ariaLabel={t('Funnel conversion')}
              columns={columns}
              rows={tableData}
              rowKey={(_, i) => String(i)}
              rowClassName={(row) =>
                tableData.indexOf(row) > 0 ? 'opacity-70' : undefined
              }
            />
          </div>
        </div>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <IconButton
              icon={<EllipsisVertical size={15} />}
              label={t('Table actions')}
              variant="ghost"
            />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItems
            items={[{ key: 'download', label: t('Export to CSV'), onClick }]}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default FunnelTable;
