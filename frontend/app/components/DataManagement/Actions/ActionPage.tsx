import { Filter } from '@/mstore/types/filterConstants';
import { useQuery } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input } from 'antd';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';

import Breadcrumb from 'Shared/Breadcrumb';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';

import { Action, fetchAction } from './api';

function ActionPage() {
  const { t } = useTranslation();
  const { actionId } = useParams<{ actionId: string }>();
  const isNew = actionId === 'new';
  const { projectsStore, filterStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const backLink = withSiteId(dataManagement.actions(), siteId);

  const { data: action, isPending } = useQuery({
    queryKey: ['action', siteId, actionId],
    queryFn: () => fetchAction(actionId),
    enabled: !isNew,
  });

  const resolved = isNew ? new Action({}) : action;

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [filters, setFilters] = React.useState<Filter[]>([]);

  React.useEffect(() => {
    if (resolved) {
      setName(resolved.name ?? '');
      setDescription(resolved.description ?? '');
    }
  }, [resolved?.id]);

  const allFilterOptions = filterStore.getScopedCurrentProjectFilters([
    'events',
  ]);
  const eventOptions = allFilterOptions.filter((i) => i.isEvent);
  const activeFilters = filters.map((f) => f.name);

  const onSave = () => {
    // TODO: wire to createAction or updateAction
  };

  const onDelete = () => {
    // TODO: wire to deleteAction
  };

  const onAddFilter = (filter: Filter) => {
    setFilters((prev) => [...prev, filter]);
  };

  const onUpdateFilter = (index: number, filter: Filter) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? filter : f)));
  };

  const onRemoveFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isNew && isPending) return null;
  if (!isNew && !resolved) {
    return <div>{t('Action {{id}} not found', { id: actionId })}</div>;
  }

  const title = isNew ? t('New Action') : name;

  return (
    <div
      className={'flex flex-col gap-2 mx-auto w-full'}
      style={{ maxWidth: 1360 }}
    >
      <Breadcrumb
        items={[
          { label: t('Actions'), to: backLink },
          { label: title },
        ]}
      />

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          <div className={'font-semibold text-lg'}>{title}</div>
          <div className="flex items-center gap-2">
            {isNew ? (
              <Button type="primary" onClick={onSave}>
                {t('Create')}
              </Button>
            ) : (
              <>
                <Button onClick={onDelete}>{t('Delete')}</Button>
                <Button type="primary" onClick={onSave}>
                  {t('Save')}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-sm">{t('Name')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Action name')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-sm">{t('Description')}</label>
            <Input.TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Action description')}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div className={'p-4'}>
          <FilterListHeader
            title={t('Events')}
            filterSelection={
              <FilterSelection
                filters={eventOptions}
                activeFilters={activeFilters}
                onFilterClick={onAddFilter}
              >
                <Button type="default" size="small">
                  <div className="flex items-center gap-1">
                    <Plus size={16} strokeWidth={1} />
                    <span>{t('Add')}</span>
                  </div>
                </Button>
              </FilterSelection>
            }
          />

          <UnifiedFilterList
            title={t('Events')}
            filters={filters}
            isDraggable={true}
            showIndices={true}
            className="mt-2"
            handleRemove={onRemoveFilter}
            handleUpdate={onUpdateFilter}
            handleAdd={onAddFilter}
            scope={'events'}
          />
        </div>
      </div>
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(ActionPage));
