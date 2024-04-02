import { Segmented } from 'antd';
import { List } from 'immutable';
import { GripHorizontal } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { Tooltip } from 'UI';

import FilterItem from '../FilterItem';

interface Props {
  filter?: any; // event/filter
  onUpdateFilter: (filterIndex: any, filter: any) => void;
  onFilterMove?: (filters: any) => void;
  onRemoveFilter: (filterIndex: any) => void;
  onChangeEventsOrder: (e: any, { name, value }: any) => void;
  hideEventsOrder?: boolean;
  observeChanges?: () => void;
  saveRequestPayloads?: boolean;
  supportsEmpty?: boolean;
  readonly?: boolean;
  excludeFilterKeys?: Array<string>;
  isConditional?: boolean;
}
function FilterList(props: Props) {
  const {
    observeChanges = () => {},
    filter,
    hideEventsOrder = false,
    saveRequestPayloads,
    supportsEmpty = true,
    excludeFilterKeys = [],
    isConditional,
  } = props;

  const filters = List(filter.filters);
  const eventsOrderSupport = filter.eventsOrderSupport;
  const hasEvents = filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = filters.filter((i: any) => !i.isEvent).size > 0;

  let rowIndex = 0;
  const cannotDeleteFilter = hasEvents && !supportsEmpty;

  useEffect(observeChanges, [filters]);

  const onRemoveFilter = (filterIndex: any) => {
    props.onRemoveFilter(filterIndex);
  };

  const [hoveredItem, setHoveredItem] = React.useState<Record<string, any>>({
    i: null,
    position: null,
  });
  const [draggedInd, setDraggedItem] = React.useState<number | null>(null);

  const handleDragOverEv = (event: Record<string, any>, i: number) => {
    event.preventDefault();
    const target = event.currentTarget.getBoundingClientRect();
    const hoverMiddleY = (target.bottom - target.top) / 2;
    const hoverClientY = event.clientY - target.top;

    const position = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
    setHoveredItem({ position, i });
  };

  const calculateNewPosition = React.useCallback(
    (draggedInd: number, hoveredIndex: number, hoveredPosition: string) => {
      if (hoveredPosition === 'bottom') {
        hoveredIndex++;
      }
      return draggedInd < hoveredIndex ? hoveredIndex - 1 : hoveredIndex;
    },
    []
  );

  const handleDragStart = React.useCallback((
    ev: Record<string, any>,
    index: number,
    elId: string
  ) => {
    ev.dataTransfer.setData("text/plain", index.toString());
    setDraggedItem(index);
    const el = document.getElementById(elId);
    console.log(el, ev);
    if (el) {
      ev.dataTransfer.setDragImage(el, 0, 0);
    }
  }, [])

  const handleDrop = React.useCallback(
    (event: Record<string, any>) => {
      event.preventDefault();
      console.log(draggedInd)
      if (draggedInd === null) return;
      const newItems = filters.toArray();
      const newPosition = calculateNewPosition(
        draggedInd,
        hoveredItem.i,
        hoveredItem.position
      );

      const reorderedItem = newItems.splice(draggedInd, 1)[0];
      newItems.splice(newPosition, 0, reorderedItem);

      props.onFilterMove?.(List(newItems));
      setHoveredItem({ i: null, position: null });
      setDraggedItem(null);
    },
    [draggedInd, hoveredItem, filters, props.onFilterMove]
  );

  const eventOrderItems = [
    {
      label: 'THEN',
      value: 'then',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('then'),
    },
    {
      label: 'AND',
      value: 'and',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('and'),
    },
    {
      label: 'OR',
      value: 'or',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('or'),
    },
  ];
  return (
    <div className="flex flex-col">
      {hasEvents && (
        <>
          <div className="flex items-center mb-2">
            <div className="text-sm color-gray-medium mr-auto">
              {filter.eventsHeader}
            </div>
            {!hideEventsOrder && (
              <div className="flex items-center gap-2">
                <div
                  className="color-gray-medium text-sm"
                  style={{ textDecoration: 'underline dotted' }}
                >
                  <Tooltip
                    title={`Select the operator to be applied between events in your search.`}
                  >
                    <div>Events Order</div>
                  </Tooltip>
                </div>

                <Segmented
                  onChange={(v) =>
                    props.onChangeEventsOrder(
                      null,
                      eventOrderItems.find((i) => i.value === v)
                    )
                  }
                  value={filter.eventsOrder}
                  options={eventOrderItems}
                />
              </div>
            )}
          </div>
          <div className={'flex flex-col'}>
            {filters.map((filter: any, filterIndex: number) =>
              filter.isEvent ? (
                <div
                  style={{
                    pointerEvents: 'unset',
                    paddingTop:
                      hoveredItem.i === filterIndex &&
                      hoveredItem.position === 'top'
                        ? '1.5rem'
                        : '0.5rem',
                    paddingBottom:
                      hoveredItem.i === filterIndex &&
                      hoveredItem.position === 'bottom'
                        ? '1.5rem'
                        : '0.5rem',
                  }}
                  className={
                    'hover:bg-active-blue -mx-5 px-5 gap-2 items-center flex w-full'
                  }
                  id={`${filter.key}-${filterIndex}`}
                  onDragOver={(e) => handleDragOverEv(e, filterIndex)}
                  onDrop={(e) => handleDrop(e)}
                  key={`${filter.key}-${filterIndex}`}
                >
                  {!!props.onFilterMove ? (
                    <div
                      className={'p-2 cursor-grab'}
                      draggable={!!props.onFilterMove}
                      onDragStart={(e) =>
                        handleDragStart(
                          e,
                          filterIndex,
                          `${filter.key}-${filterIndex}`
                        )
                      }
                    >
                      <GripHorizontal size={16} />
                    </div>
                  ) : null}
                  <FilterItem
                    filterIndex={rowIndex++}
                    filter={filter}
                    onUpdate={(filter) =>
                      props.onUpdateFilter(filterIndex, filter)
                    }
                    onRemoveFilter={() => onRemoveFilter(filterIndex)}
                    saveRequestPayloads={saveRequestPayloads}
                    disableDelete={cannotDeleteFilter}
                    excludeFilterKeys={excludeFilterKeys}
                    readonly={props.readonly}
                    isConditional={isConditional}
                  />
                </div>
              ) : null
            )}
          </div>
          <div className="mb-2" />
        </>
      )}

      {hasFilters && (
        <>
          {hasEvents && <div className="border-t -mx-5 mb-4" />}
          <div className="mb-2 text-sm color-gray-medium mr-auto">FILTERS</div>
          {filters.map((filter: any, filterIndex: any) =>
            !filter.isEvent ? (
              <FilterItem
                key={filterIndex}
                readonly={props.readonly}
                isFilter={true}
                filterIndex={filterIndex}
                filter={filter}
                onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
                onRemoveFilter={() => onRemoveFilter(filterIndex)}
                excludeFilterKeys={excludeFilterKeys}
                isConditional={isConditional}
              />
            ) : null
          )}
        </>
      )}
    </div>
  );
}

export default observer(FilterList);
