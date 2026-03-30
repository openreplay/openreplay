/* eslint-disable i18next/no-literal-string */
import { useStore } from '@/mstore';
import { Filter } from '@/mstore/types/filterConstants';
import { Button, Card, Space } from 'antd';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FilterSelection from 'Shared/Filters/FilterSelection';

import BreakdownFilterItem from './BreakdownFilterItem';

interface Props {
  metric: any;
  observeChanges?: () => void;
}

const supportedOptions = [
  'userCountry',
  'userCity',
  'userState',
  'userBrowser',
  'userDevice',
  'userOs',
  'referrer',
  'userId',
  'platform',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'userDeviceType',
  'revId',
  'issueType',
  'currentPath',
  'referringDomain',
  'searchEngine',
  'httpMethod',
  'statusCode',
  'urlHost',
];

function BreakdownFilter({ metric, observeChanges = () => {} }: Props) {
  const { t } = useTranslation();
  const { filterStore } = useStore();
  const [expanded, setExpanded] = useState(metric.breakdowns?.length > 0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<'top' | 'bottom' | null>(null);

  const onDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedIdx(index);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = (rect.top + rect.bottom) / 2;
    const pos = e.clientY < midY ? 'top' : 'bottom';
    setHoverIdx(index);
    setHoverPos(pos);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isNaN(from) || hoverIdx === null) {
        setDraggedIdx(null);
        setHoverIdx(null);
        setHoverPos(null);
        return;
      }
      let to = hoverPos === 'bottom' ? hoverIdx + 1 : hoverIdx;
      if (from < to) to--;
      if (from !== to) {
        metric.moveBreakdown(from, to);
        observeChanges();
      }
      setDraggedIdx(null);
      setHoverIdx(null);
      setHoverPos(null);
    },
    [hoverIdx, hoverPos, metric, observeChanges],
  );

  const onDragEnd = useCallback(() => {
    setDraggedIdx(null);
    setHoverIdx(null);
    setHoverPos(null);
  }, []);

  const allFilterOptions: Filter[] = filterStore.getScopedCurrentProjectFilters(
    ['sessions'],
  );
  const breakdownLabels: any[] = metric.breakdowns || [];
  const breakdownFilters: Filter[] = breakdownLabels
    .map((label: string) => allFilterOptions.find((f) => f.name === label))
    .filter((f): f is Filter => f !== undefined);
  const activeFilterNames = breakdownFilters.map((f: any) => f.name);
  const propertyOptions: Filter[] = allFilterOptions.filter(
    (i) =>
      !i.isEvent &&
      supportedOptions.includes(i.name) &&
      !activeFilterNames.includes(i.name),
  );
  const canAddMore = activeFilterNames.length < 3;

  const onAddFilter = (filter: Filter) => {
    metric.addBreakdown(filter);
    observeChanges();
    setExpanded(true);
  };

  const onReplaceFilter = (index: number) => (filter: Filter) => {
    metric.updateBreakdown(index, filter);
    observeChanges();
  };

  const onRemoveFilter = (index: number) => {
    metric.removeBreakdown(index);
    observeChanges();
  };

  return (
    <Card
      size="small"
      className="rounded-lg"
      classNames={{
        body: `${expanded ? 'p-4!' : 'p-0!'}`,
        header: 'px-4! py-2!',
      }}
      title={
        <div className="flex gap-2 items-center">
          <span className="font-medium">{t('Breakdown')}</span>
          <FilterSelection
            type="Filters"
            disabled={!canAddMore}
            filters={propertyOptions}
            onFilterClick={onAddFilter}
            activeFilters={activeFilterNames}
          >
            <Button type="text" size="small" disabled={!canAddMore}>
              <div className="flex items-center gap-1">
                <Plus size={16} strokeWidth={1} />
                <span>{t('Add')}</span>
              </div>
            </Button>
          </FilterSelection>
          <Space className="ml-auto">
            <Button
              onClick={() => setExpanded(!expanded)}
              size="small"
              icon={
                expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
              }
              type="text"
            />
          </Space>
        </div>
      }
    >
      {expanded && (
        <>
          {breakdownFilters.length > 0 ? (
            <div className="flex flex-col gap-1 mt-2">
              {breakdownFilters.map((filter: any, index: number) => (
                <BreakdownFilterItem
                  key={index}
                  filter={filter}
                  index={index}
                  onReplaceFilter={onReplaceFilter}
                  onRemoveFilter={onRemoveFilter}
                  propertyOptions={propertyOptions}
                  activeFilterNames={activeFilterNames}
                  draggedIdx={draggedIdx}
                  hoverIdx={hoverIdx}
                  hoverPos={hoverPos}
                  setHoverIdx={setHoverIdx}
                  setHoverPos={setHoverPos}
                  breakdownFilters={breakdownFilters}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm mt-2">
              {t('Add a property to breakdown results by.')}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default observer(BreakdownFilter);
