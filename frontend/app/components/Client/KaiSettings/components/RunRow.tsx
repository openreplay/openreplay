import { Alert, Tag } from 'antd';
import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

export interface RunData {
  key: string;
  date: number;
  result: string;
  log: string;
}

function RunRow({ run }: { run: RunData }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <div
        className="grid grid-cols-12 py-3 px-4 items-center cursor-pointer hover:bg-active-blue select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-1">
          <ChevronRight
            size={14}
            className="transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          />
        </div>
        <div className="col-span-5">{formatDateTimeDefault(run.date)}</div>
        <div className="col-span-6 text-end">
          <Tag color={run.result === 'passed' ? 'green' : 'red'}>
            {run.result === 'passed' ? t('Passed') : t('Failed')}
          </Tag>
        </div>
      </div>
      {expanded && (
        <div className="p-4">
          <Alert
            type={run.result === 'passed' ? 'success' : 'error'}
            description={<span className="text-sm">{run.log}</span>}
            showIcon={false}
          />
        </div>
      )}
    </div>
  );
}

export default RunRow;
