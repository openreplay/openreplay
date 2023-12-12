import { durationFormatted } from 'App/date';
import React from 'react';
import FunnelStepText from './FunnelStepText';
import { Icon } from 'UI';

interface Props {
  filter: any;
}

function FunnelBar(props: Props) {
  const { filter } = props;

  return (
    <div className="w-full mb-4">
      <FunnelStepText filter={filter} />
      <div
        style={{
          height: '25px',
          width: '100%',
          backgroundColor: '#f5f5f5',
          position: 'relative',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center"
          style={{
            width: `${filter.completedPercentageTotal}%`,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: '#00b5ad',
          }}
        >
          <div className="color-white absolute right-0 flex items-center font-medium mr-2 leading-3">
            {filter.completedPercentageTotal}%
          </div>
        </div>
      </div>
      <div className="flex justify-between py-2">
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="arrow-right-short" size="20" color="green" />
          <span className="mx-1 font-medium">{filter.sessionsCount} Sessions</span>
          <span className="color-gray-medium text-sm">
            ({filter.completedPercentage}%) Completed
          </span>
        </div>
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="caret-down-fill" color="red" size={16} />
          <span className="font-medium mx-1 color-red">{filter.droppedCount} Sessions</span>
          <span className="text-sm color-red">({filter.droppedPercentage}%) Dropped</span>
        </div>
      </div>
    </div>
  );
}

export function UxTFunnelBar(props: Props) {
  const { filter } = props;

  return (
    <div className="w-full mb-4">
      <div className={'font-medium'}>{filter.title}</div>
      <div
        style={{
          height: '25px',
          width: '100%',
          backgroundColor: '#f5f5f5',
          position: 'relative',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center"
          style={{
            width: `${(filter.completed/(filter.completed+filter.skipped))*100}%`,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: '#00b5ad',
          }}
        >
          <div className="color-white absolute right-0 flex items-center font-medium mr-2 leading-3">
            {((filter.completed/(filter.completed+filter.skipped))*100).toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="flex justify-between py-2">
        {/* @ts-ignore */}
        <div className={'flex items-center gap-4'}>
          <div className="flex items-center">
            <Icon name="arrow-right-short" size="20" color="green" />
            <span className="mx-1 font-medium">{filter.completed}</span><span>completed this step</span>
          </div>
          <div className={'flex items-center'}>
            <Icon name="clock" size="16" />
            <span className="mx-1 font-medium">
              {durationFormatted(filter.avgCompletionTime)}
            </span>
            <span>
              Avg. completion time
            </span>
          </div>
        </div>
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="caret-down-fill" color="red" size={16} />
          <span className="font-medium mx-1">{filter.skipped}</span><span> skipped</span>
        </div>
      </div>
    </div>
  );
}

export default FunnelBar;

const calculatePercentage = (completed: number, dropped: number) => {
  const total = completed + dropped;
  if (dropped === 0) return 100;
  if (total === 0) return 0;

  return Math.round((completed / dropped) * 100);
};
