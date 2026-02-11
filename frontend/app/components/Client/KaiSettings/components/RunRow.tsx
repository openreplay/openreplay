import { Alert, Tag } from 'antd';
import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTimeDefault } from 'App/date';

import { RunData } from './shared/types';
import { formatDuration } from './shared/utils';

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
        <div className="col-span-3">{run.testName}</div>
        <div className="col-span-3">{formatDateTimeDefault(run.date)}</div>
        <div className="col-span-2">{formatDuration(run.duration)}</div>
        <div className="col-span-3 text-end">
          <Tag color={run.result === 'passed' ? 'green' : 'red'}>
            {run.result === 'passed' ? t('Passed') : t('Failed')}
          </Tag>
        </div>
      </div>
      {expanded && (
        <div className="p-4 grid grid-cols-12 gap-4">
          {/* Left: Steps */}
          <div className="col-span-7 flex flex-col gap-2">
            <div className="font-medium text-sm">{t('Test Steps')}</div>
            <ol className="ml-4 text-sm flex flex-col gap-1">
              {run.steps.map((step, idx) => (
                <li
                  key={idx}
                  className={`
                    ${step.status === 'failed' ? 'text-red bg-red-lightest font-medium p-2 rounded' : ''}
                    ${step.status === 'skipped' ? 'text-disabled-text' : ''}
                  `}
                >
                  {step.step}
                  {step.status === 'failed' && (
                    <span className="ml-2 text-xs">
                      ({t('Failed')})
                    </span>
                  )}
                  {step.status === 'skipped' && (
                    <span className="ml-2 text-xs">
                      ({t('Skipped')})
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Right: Video player and failure info */}
          <div className="col-span-5 flex flex-col gap-3">
            {run.failedStep !== undefined && (
              <Alert
                type="error"
                classNames={{
                  root: 'px-4! py-2!'
                }}
                title={t('Test Failed')}
                description={
                  <span className="text-sm">
                    {t('Failed at step')}: {run.failedStep + 1}
                  </span>
                }
                showIcon={false}
              />
            )}
            <div className="border rounded overflow-hidden bg-gray-100">
              <img
                src="https://placehold.co/600x400?text=Hello+World"
                alt="Test recording"
                className="w-full"
              />
            </div>
            <div className="text-xs text-disabled-text text-center">
              {t('Test recording will be available here')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunRow;
