import { Icon } from '@/ui/icons/Icon';
import { Tooltip } from '@/ui/overlays/tooltip';
import cn from 'classnames';
import { Info } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { getTimelinePosition } from 'App/utils';

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
  disabled?: boolean;
  /** pointers drawn over the performance graph (mobile perf warnings) */
  marks?: any[];
  renderMark?: (item: any) => React.ReactNode;
}
const EventRow = React.memo((props: Props) => {
  const {
    title,
    className,
    list = [],
    endTime = 0,
    isGraph = false,
    message = '',
    disabled,
  } = props;
  const { t } = useTranslation();
  const scale = 100 / endTime;
  const _list = React.useMemo<
    { isGrouped: boolean; items: any[]; left: number }[]
  >(() => {
    if (isGraph) return [];
    const tolerance = 2; // within what %s to group items
    const groupedItems: { isGrouped: boolean; items: any[]; left: number }[] =
      [];
    let currentGroup: any[] = [];
    let currentLeft = 0;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const spread = item.toJS ? { ...item.toJS() } : item;
      const left: number = getTimelinePosition(item.time, scale);
      const itemWithLeft = { ...spread, left };

      if (currentGroup.length === 0) {
        currentGroup.push(itemWithLeft);
        currentLeft = left;
      } else if (Math.abs(left - currentLeft) <= tolerance) {
        currentGroup.push(itemWithLeft);
      } else {
        if (currentGroup.length > 1) {
          const leftValues = currentGroup.map((item) => item.left);
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

    if (currentGroup.length > 1) {
      const leftValues = currentGroup.map((item) => item.left);
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
  }, [isGraph, list, scale]);

  return (
    <div className={cn('m-dt__lane', `is-${title.toLowerCase()}`, className)}>
      <span className="m-dt__lane-title">
        {title}
        {message ? (
          <Tooltip title={message} side="left">
            <Info size={11} aria-hidden="true" />
          </Tooltip>
        ) : null}
      </span>
      <div className="m-dt__lane-track">
        {isGraph ? (
          <>
            <PerformanceGraph disabled={disabled} list={list} />
            {props.marks?.map((m, i) => (
              <div
                key={i}
                className="m-dt__mark-slot"
                style={{ left: `${getTimelinePosition(m.time, scale)}%` }}
              >
                {props.renderMark?.(m)}
              </div>
            ))}
          </>
        ) : _list.length > 0 ? (
          _list.map(
            (
              item: { items: any[]; left: number; isGrouped: boolean },
              index: number,
            ) => (
              <div
                key={index}
                className="m-dt__mark-slot"
                style={{ left: `${item.left}%` }}
              >
                {props.renderElement
                  ? props.renderElement(item.items, item.isGrouped)
                  : null}
              </div>
            ),
          )
        ) : (
          <span className="m-dt__lane-none">{t('None captured.')}</span>
        )}
      </div>
    </div>
  );
});

export default EventRow;
