import React from 'react';
import { Icon, Input } from 'UI';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { Typography, Button } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useStore } from 'App/mstore';
import { Filter } from '@/mstore/types/filterConstants';
import FilterSelection from 'Shared/Filters/FilterSelection';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';

interface Props {
  set: number;
  removeCondition: (ind: number) => void;
  index: number;
  readonly?: boolean;
  onAddFilter: (filter: Record<string, any>) => void;
  conditions: any;
  bottomLine1: string;
  bottomLine2: string;
  onPercentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateFilter: (filterIndex: number, filter: any) => void;
  onRemoveFilter: (filterIndex: number) => void;
  onChangeEventsOrder: (_: any, { name, value }: any) => void;
  changeName: (name: string) => void;
  isMobile?: boolean;
}

function ConditionSetComponent({
  removeCondition,
  index,
  set,
  readonly,
  onAddFilter,
  bottomLine1,
  bottomLine2,
  onPercentChange,
  conditions,
  onUpdateFilter,
  onRemoveFilter,
  isMobile,
  changeName,
}: Props) {
  const { filterStore } = useStore();
  const { t } = useTranslation();

  const indexedFilters = conditions.filter.filters.map((f, i) => ({
    ...f,
    originalIndex: i,
  }));
  const activeFilters = indexedFilters.map((f) => f.name);
  const actualEvents = indexedFilters.filter((f) => f.isEvent);
  const actualProperties = indexedFilters.filter((f) => !f.isEvent);

  const allFilterOptions: Filter[] = filterStore.getCurrentProjectFilters();
  const allowedOptions = allFilterOptions.filter((f) => f.isConditional);
  const eventOptions: Filter[] = allowedOptions.filter((i) => i.isEvent);
  const propertyOptions: Filter[] = allowedOptions.filter((i) => !i.isEvent);
  const disableEvents = false;

  const onFilterMove = (draggedIdx: number, targetIdx: number) => {
    conditions.filter.moveFilter(draggedIdx, targetIdx);
  };
  return (
    <div className="border bg-white rounded">
      <div className="flex items-center border-b px-4 py-2 gap-2">
        {conditions.name ? (
          <div className="flex gap-2">
            <BranchesOutlined rotate={90} />
            <Typography.Text
              className="underline decoration-dashed decoration-black cursor-pointer"
              editable={{
                onChange: changeName,
                triggerType: ['icon', 'text'],
                maxLength: 20,
              }}
            >
              {conditions.name}
            </Typography.Text>
          </div>
        ) : (
          <>
            <div>{t('Condition')}</div>
            <div className="p-2 rounded bg-gray-lightest">
              {t('Set')}
              {set}
            </div>
          </>
        )}
        {readonly ? null : (
          <div
            className={cn(
              'p-2 px-4 cursor-pointer rounded ml-auto',
              'hover:bg-teal-light',
            )}
            onClick={() => removeCondition(index)}
          >
            <Icon name="trash" color="main" />
          </div>
        )}
      </div>
      <div className="p-2">
        <div className={conditions.filter.filters.length > 0 ? 'p-2 mb-2' : ''}>
          <FilterListHeader
            title="Events"
            showEventsOrder={false}
            filterSelection={
              <FilterSelection
                disabled={disableEvents}
                activeFilters={activeFilters}
                filters={eventOptions}
                onFilterClick={onAddFilter}
              >
                <Button type="default" size="small">
                  <div className="flex items-center gap-1">
                    <Plus size={16} strokeWidth={1} />
                    <span>Add</span>
                  </div>
                </Button>
              </FilterSelection>
            }
          />

          <UnifiedFilterList
            title="Events"
            filters={actualEvents}
            isDraggable={true}
            showIndices={true}
            className="mt-2"
            handleRemove={
              disableEvents
                ? undefined
                : (idx) => onRemoveFilter(actualEvents[idx].originalIndex)
            }
            handleUpdate={(idx, filter) =>
              onUpdateFilter(actualEvents[idx].originalIndex, filter)
            }
            handleAdd={onAddFilter}
            handleMove={(draggedIdx, newPos) => {
              const dragged = actualEvents[draggedIdx];
              const target = actualEvents[newPos];
              onFilterMove(dragged.originalIndex, target.originalIndex);
            }}
          />

          <FilterListHeader
            title="Filters"
            showEventsOrder={actualProperties.length > 0}
            filterSelection={
              <FilterSelection
                filters={propertyOptions}
                onFilterClick={onAddFilter}
                activeFilters={activeFilters}
              >
                <Button type="default" size="small">
                  <div className="flex items-center gap-1">
                    <Plus size={16} strokeWidth={1} />
                    <span>Add</span>
                  </div>
                </Button>
              </FilterSelection>
            }
          />

          <UnifiedFilterList
            title="Filters"
            filters={actualProperties}
            isDraggable={false}
            showIndices={false}
            className="mt-2"
            isHeatmap={false}
            handleRemove={(idx) =>
              onRemoveFilter(actualProperties[idx].originalIndex)
            }
            handleUpdate={(idx, filter) =>
              onUpdateFilter(actualProperties[idx].originalIndex, filter)
            }
            handleAdd={onAddFilter}
            handleMove={onFilterMove}
          />
          {readonly && !conditions.filter?.filters?.length ? (
            <div className="p-2">{t('No conditions')}</div>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-2 flex items-center gap-2 border-t">
        <span>{bottomLine1}</span>
        {readonly ? (
          <div className="font-semibold">{conditions.rolloutPercentage}%</div>
        ) : (
          <Input
            type="text"
            width={60}
            value={conditions.rolloutPercentage}
            onChange={onPercentChange}
            leadingButton={<div className="p-2 text-disabled-text">%</div>}
          />
        )}

        <span>{bottomLine2}</span>
      </div>
    </div>
  );
}

export default observer(ConditionSetComponent);
