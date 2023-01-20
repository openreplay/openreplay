import React from 'react';
import cn from 'classnames';
import { getTimelinePosition } from 'App/utils';
import { Icon, Tooltip } from 'UI';
import PerformanceGraph from '../PerformanceGraph';
interface Props {
  list?: any[];
  title: string;
  message?: string;
  className?: string;
  endTime?: number;
  renderElement?: (item: any) => React.ReactNode;
  isGraph?: boolean;
  zIndex?: number;
  noMargin?: boolean;
}
const EventRow = React.memo((props: Props) => {
  const { title, className, list = [], endTime = 0, isGraph = false, message = '' } = props;
  const scale = 100 / endTime;
  const _list =
    !isGraph &&
    React.useMemo(() => {
      return list.map((item: any, _index: number) => {
        const spread = item.toJS ? { ...item.toJS() } : { ...item };
        return {
          ...spread,
          left: getTimelinePosition(item.time, scale),
        };
      });
    }, [list]);

  return (
    <div
      className={cn('w-full flex flex-col py-2', className)}
      style={{ height: isGraph ? 60 : 50 }}
    >
      <div
        className={cn(
          'uppercase color-gray-medium text-sm flex items-center py-1',
          props.noMargin ? '' : 'ml-2'
        )}
      >
        <div
          style={{ zIndex: props.zIndex ? props.zIndex : undefined }}
          className="mr-2 leading-none"
        >
          {title}
        </div>
        {message ? <RowInfo message={message} /> : null}
      </div>
      <div className="relative w-full" style={{ zIndex: props.zIndex ? props.zIndex : undefined }}>
        {isGraph ? (
          <PerformanceGraph list={list} />
        ) : _list.length > 0 ? (
          _list.map((item: any, index: number) => {
            return (
              <div
                key={index}
                className="absolute"
                style={{
                  left: `clamp(0%, calc(${item.left}% - 7px), calc(100% - 14px))`,
                  zIndex: props.zIndex ? props.zIndex : undefined,
                }}
              >
                {props.renderElement ? props.renderElement(item) : null}
              </div>
            );
          })
        ) : (
          <div className={cn('color-gray-medium text-sm pt-2', props.noMargin ? '' : 'ml-4')}>
            None captured.
          </div>
        )}
      </div>
    </div>
  );
});

export default EventRow;

function RowInfo({ message }: any) {
  return (
    <Tooltip title={message} delay={0}>
      <Icon name="info-circle" color="gray-medium" />
    </Tooltip>
  );
}
