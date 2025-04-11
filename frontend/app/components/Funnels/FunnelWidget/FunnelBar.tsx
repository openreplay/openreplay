import { durationFormatted } from 'App/date';
import React from 'react';
import { Icon } from 'UI';
import { Space } from 'antd';
import { Styles } from 'Components/Dashboard/Widgets/common';
import cn from 'classnames';
import FunnelStepText from './FunnelStepText';
import { useTranslation } from 'react-i18next';

interface Props {
  filter: any;
  compData?: any;
  index?: number;
  focusStage?: (index: number, isFocused: boolean) => void;
  focusedFilter?: number | null;
  metricLabel?: string;
  isHorizontal?: boolean;
}

function FunnelBar(props: Props) {
  const { filter, index, focusStage, focusedFilter, compData, isHorizontal } =
    props;

  const isFocused =
    focusedFilter && index ? focusedFilter === index - 1 : false;
  return (
    <div className="w-full mb-2">
      <FunnelStepText filter={filter} isHorizontal={isHorizontal} />
      <div className={isHorizontal ? 'flex gap-1' : 'flex flex-col'}>
        <FunnelBarData
          data={props.filter}
          isHorizontal={isHorizontal}
          isComp={false}
          index={index}
          isFocused={isFocused}
          focusStage={focusStage}
        />
        {compData ? (
          <FunnelBarData
            data={props.compData}
            isHorizontal={isHorizontal}
            isComp
            index={index}
            isFocused={isFocused}
            focusStage={focusStage}
          />
        ) : null}
      </div>
    </div>
  );
}

function FunnelBarData({
  data,
  isComp,
  isFocused,
  focusStage,
  index,
  isHorizontal,
}: {
  data: any;
  isComp?: boolean;
  isFocused?: boolean;
  focusStage?: (index: number, isComparison: boolean) => void;
  index?: number;
  isHorizontal?: boolean;
}) {
  const { t } = useTranslation();
  const vertFillBarStyle = {
    width: `${data.completedPercentageTotal}%`,
    height: '100%',
    backgroundColor: isComp ? Styles.compareColors[2] : Styles.compareColors[1],
  };
  const horizontalFillBarStyle = {
    width: '100%',
    height: `${data.completedPercentageTotal}%`,
    backgroundColor: isComp ? Styles.compareColors[2] : Styles.compareColors[1],
  };

  const vertEmptyBarStyle = {
    width: `${100.1 - data.completedPercentageTotal}%`,
    height: '100%',
    background: isFocused
      ? 'rgba(204, 0, 0, 0.3)'
      : 'repeating-linear-gradient(325deg, lightgray, lightgray 1px, #FFF1F0 1px, #FFF1F0 6px)',
    cursor: 'pointer',
  };
  const horizontalEmptyBarStyle = {
    height: `${100.1 - data.completedPercentageTotal}%`,
    width: '100%',
    background: isFocused
      ? 'rgba(204, 0, 0, 0.3)'
      : 'repeating-linear-gradient(325deg, lightgray, lightgray 1px, #FFF1F0 1px, #FFF1F0 6px)',
    cursor: 'pointer',
  };

  const fillBarStyle = isHorizontal ? horizontalFillBarStyle : vertFillBarStyle;
  const emptyBarStyle = isHorizontal
    ? horizontalEmptyBarStyle
    : vertEmptyBarStyle;
  return (
    <div>
      <div
        className={isHorizontal ? 'rounded-t' : ''}
        style={{
          height: isHorizontal ? '210px' : '21px',
          width: isHorizontal ? '200px' : '99.8%',
          backgroundColor: '#f5f5f5',
          position: 'relative',
          borderRadius: isHorizontal ? undefined : '.5rem',
          overflow: 'hidden',
          opacity: isComp ? 0.7 : 1,
          display: 'flex',
          flexDirection: isHorizontal ? 'column-reverse' : 'row',
        }}
      >
        <div
          className={cn(
            'flex',
            isHorizontal
              ? 'justify-center items-start pt-1'
              : 'justify-end items-center pr-1',
          )}
          style={fillBarStyle}
        >
          <div className="color-white flex items-center font-medium leading-3">
            {data.completedPercentageTotal}%
          </div>
        </div>
        <div
          style={emptyBarStyle}
          onClick={() => focusStage?.(index! - 1, isComp)}
          className="hover:opacity-70"
        />
      </div>
      <div className={cn('flex justify-between', isComp ? 'opacity-60' : '')}>
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="arrow-right-short" size="20" color="green" />
          <span className="color-gray-medium text-sm">
            {`${data.completedPercentage}% . ${data.count}`}
          </span>
        </div>
        {index && index > 1 && (
          <Space className="items-center">
            <Icon
              name="caret-down-fill"
              color={data.droppedCount > 0 ? 'red' : 'gray-light'}
              size={16}
            />
            <span
              className={`mr-1 text-sm${data.droppedCount > 0 ? 'color-red' : 'disabled'}`}
            >
              {data.droppedCount}&nbsp;{t('Skipped')}
            </span>
          </Space>
        )}
      </div>
    </div>
  );
}

export function UxTFunnelBar(props: Props) {
  const { t } = useTranslation();
  const { filter } = props;

  return (
    <div className="w-full mb-2">
      <div className="font-medium">{filter.title}</div>
      <div
        style={{
          height: '25px',
          width: '99.8%',
          backgroundColor: '#f5f5f5',
          position: 'relative',
          borderRadius: '.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center"
          style={{
            width: `${
              (filter.completed / (filter.completed + filter.skipped)) * 100
            }%`,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: '#6272FF',
          }}
        >
          <div className="color-white absolute right-0 flex items-center font-medium mr-1 leading-3 text-sm">
            {(
              (filter.completed / (filter.completed + filter.skipped)) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
      </div>
      <div className="flex justify-between py-2">
        {/* @ts-ignore */}
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Icon name="arrow-right-short" size="20" color="green" />
            <span className="mx-1 font-medium">{filter.completed}</span>
            <span>{t('completed this step')}</span>
          </div>
          <div className="flex items-center">
            <Icon name="clock" size="16" />
            <span className="mx-1 font-medium">
              {durationFormatted(filter.avgCompletionTime)}
            </span>
            <span>{t('avg. completion time')}</span>
          </div>
        </div>
        {/* @ts-ignore */}
        <div className="flex items-center">
          <Icon name="caret-down-fill" color="red" size={16} />
          <span className="font-medium mx-1">{filter.skipped}</span>
          <span>&nbsp;{t('skipped')}</span>
        </div>
      </div>
    </div>
  );
}

export default FunnelBar;
