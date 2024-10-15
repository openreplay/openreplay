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
  renderElement?: (item: any, isGrouped: boolean) => React.ReactNode;
  isGraph?: boolean;
  zIndex?: number;
  noMargin?: boolean;
}
const EventRow = React.memo((props: Props) => {
  const { title, className, list = [], endTime = 0, isGraph = false, message = '' } = props;
  const scale = 100 / endTime;
  const _list =
    isGraph ? [] :
    React.useMemo(() => {
      const tolerance = 2; // within what %s to group items
      const groupedItems = [];
      let currentGroup = [];
      let currentLeft = 0;

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const spread = item.toJS ? { ...item.toJS() } : item;
        const left: number = getTimelinePosition(item.time, scale);
        const itemWithLeft = { ...spread, left };

        if (currentGroup.length === 0) {
          currentGroup.push(itemWithLeft);
          currentLeft = left;
        } else {
          if (Math.abs(left - currentLeft) <= tolerance) {
            currentGroup.push(itemWithLeft);
          } else {
            if (currentGroup.length > 1) {
              const leftValues = currentGroup.map(item => item.left);
              const minLeft = Math.min(...leftValues);
              const maxLeft = Math.max(...leftValues);
              const middleLeft = (minLeft + maxLeft) / 2;

              groupedItems.push({
                isGrouped: true,
                items: currentGroup,
                left: middleLeft,
              });
            } else {
              groupedItems.push({
                isGrouped: false,
                items: [currentGroup[0]],
                left: currentGroup[0].left,
              });
            }
            currentGroup = [itemWithLeft];
            currentLeft = left;
          }
        }
      }

      if (currentGroup.length > 1) {
        const leftValues = currentGroup.map(item => item.left);
        const minLeft = Math.min(...leftValues);
        const maxLeft = Math.max(...leftValues);
        const middleLeft = (minLeft + maxLeft) / 2;

        groupedItems.push({
          isGrouped: true,
          items: currentGroup,
          left: middleLeft,
        });
      } else if (currentGroup.length === 1) {
        groupedItems.push({
          isGrouped: false,
          items: [currentGroup[0]],
          left: currentGroup[0].left,
        });
      }

      return groupedItems;
    }, [list]);

  return (
    <div
      className={cn('w-full flex flex-col py-2', className)}
      style={{ height: isGraph ? 60 : 50 }}
    >
      <div
        className={cn(
          'uppercase text-sm flex items-center py-1',
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
          _list.map((item: { items: any[], left: number, isGrouped: boolean }, index: number) => {
            const left = item.left
            return (
              <div
                key={index}
                className="absolute"
                style={{
                  left: `clamp(0%, calc(${left}% - 7px), calc(100% - 14px))`,
                  zIndex: props.zIndex ? props.zIndex : undefined,
                }}
              >
                {props.renderElement ? props.renderElement(item.items, item.isGrouped) : null}
              </div>
            );
          })
        ) : (
          <div className={cn('color-gray-medium text-sm', props.noMargin ? '' : 'ml-4')}>
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
