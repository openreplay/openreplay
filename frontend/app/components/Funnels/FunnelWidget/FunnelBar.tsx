import { durationFormatted } from 'App/date';
import React from 'react';
import FunnelStepText from './FunnelStepText';
import { Icon } from 'UI';
import { Space } from 'antd';
import { Styles } from 'Components/Dashboard/Widgets/common';

interface Props {
  filter: any;
  index?: number;
  focusStage?: (index: number, isFocused: boolean) => void;
  focusedFilter?: number | null;
}

function FunnelBar(props: Props) {
  const { filter, index, focusStage, focusedFilter } = props;

  const isFocused = focusedFilter && index ? focusedFilter === index - 1 : false;
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
          overflow: 'hidden'
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
            backgroundColor: Styles.colors[0]
          }}
        >
          <div className="color-white absolute right-0 flex items-center font-medium mr-2 leading-3">
            {filter.completedPercentageTotal}%
          </div>
        </div>
        <div
          style={{
            width: `${100.1 - filter.completedPercentageTotal}%`,
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isFocused ? 'rgba(204, 0, 0, 0.3)' : '#fff0f0',
            cursor: 'pointer'
          }}
          onClick={() => focusStage?.(index! - 1, filter.isActive)}
          className={'hover:opacity-75'}
        />
      </div>
      <div className="flex justify-between py-2">
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="arrow-right-short" size="20" color="green" />
          <span className="mx-1">{filter.sessionsCount} Sessions</span>
          <span className="color-gray-medium text-sm">
            ({filter.completedPercentage}%) Completed
          </span>
        </div>
        <Space className="items-center">
          <Icon name="caret-down-fill" color={filter.droppedCount > 0 ? 'red' : 'gray-light'} size={16} />
          <span
            className={'mx-1 ' + (filter.droppedCount > 0 ? 'color-red' : 'disabled')}>{filter.droppedCount} Sessions</span>
          <span
            className={'text-sm ' + (filter.droppedCount > 0 ? 'color-red' : 'disabled')}>({filter.droppedPercentage}%) Dropped</span>
        </Space>
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
          overflow: 'hidden'
        }}
      >
        <div
          className="flex items-center"
          style={{
            width: `${(filter.completed / (filter.completed + filter.skipped)) * 100}%`,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: '#00b5ad'
          }}
        >
          <div className="color-white absolute right-0 flex items-center font-medium mr-2 leading-3">
            {((filter.completed / (filter.completed + filter.skipped)) * 100).toFixed(1)}%
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
