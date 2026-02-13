import { Filter } from '@/mstore/types/filterConstants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { NoContent, confirm } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Breadcrumb from 'Shared/Breadcrumb';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { toast } from 'react-toastify';

import {
  Action,
  createAction,
  deleteAction,
  fetchAction,
  updateAction,
} from './api';

function ActionPage() {
  const { t } = useTranslation();
  const { actionId } = useParams<{ actionId: string }>();
  const isNew = actionId === 'new';
  const history = useHistory();
  const queryClient = useQueryClient();
  const { projectsStore, filterStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const backLink = withSiteId(dataManagement.actions(), siteId);

  const { data: action, isPending } = useQuery({
    queryKey: ['action', siteId, actionId],
    queryFn: () => fetchAction(actionId),
    enabled: !isNew,
  });

  const resolved = isNew ? new Action() : action;

  const [editing, setEditing] = React.useState(isNew);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [filters, setFilters] = React.useState<Filter[]>([]);

  React.useEffect(() => {
    if (resolved) {
      setName(resolved.name ?? '');
      setDescription(resolved.description ?? '');
      setFilters(resolved.filters as unknown as Filter[]);
    }
  }, [resolved?.id]);

  const allFilterOptions = filterStore.getScopedCurrentProjectFilters([
    'events',
  ]);
  const eventOptions = allFilterOptions.filter((i) => i.isEvent);
  const activeFilters = filters.map((f) => f.name);

  const createMutation = useMutation({
    mutationFn: createAction,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['actions-list'] });
      history.push(withSiteId(dataManagement.actionPage(created.id), siteId!));
    },
    onError: () => {
      toast.error(t('Failed to create action. Please try again.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Pick<Action, 'name' | 'description' | 'filters'>) =>
      updateAction(actionId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-list'] });
      queryClient.invalidateQueries({ queryKey: ['action', siteId, actionId] });
      setEditing(false);
    },
    onError: () => {
      toast.error(t('Failed to update action. Please try again.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAction(actionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-list'] });
      history.push(backLink);
    },
    onError: () => {
      toast.error(t('Failed to delete action. Please try again.'));
    },
  });

  const canSave = name.trim().length > 0 && filters.length > 0;

  const onSave = () => {
    if (!canSave) return;
    const payload = {
      name,
      description,
      filters,
    } as unknown as Pick<Action, 'name' | 'description' | 'filters'>;
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const onCancel = () => {
    if (resolved) {
      setName(resolved.name ?? '');
      setDescription(resolved.description ?? '');
      setFilters(resolved.filters as unknown as Filter[]);
    }
    setEditing(false);
  };

  const onDelete = async () => {
    const confirmed = await confirm({
      header: t('Delete Action'),
      confirmation: t(
        'Are you sure you want to permanently delete this action?',
      ),
      confirmButton: t('Yes, Delete'),
    } as any);
    if (!confirmed) return;
    deleteMutation.mutate();
  };

  const onAddFilter = async (filter: Filter) => {
    if (filter.isEvent && (!filter.filters || filter.filters.length === 0)) {
      const props = await filterStore.getEventFilters(filter.id);
      filter.filters = props?.filter((prop: any) => prop.defaultProperty);
    }
    setFilters((prev) => [...prev, filter]);
  };

  const onUpdateFilter = (index: number, filter: Filter) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? filter : f)));
  };

  const onRemoveFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isNew && isPending)
    return (
      <div
        className={'flex flex-col gap-2 mx-auto w-full'}
        style={{ maxWidth: 1360 }}
      >
        <Breadcrumb
          items={[
            { label: t('Actions'), to: backLink },
            { label: t('Loading') },
          ]}
        />
        <NoContent
          show
          title={<AnimatedSVG name={ICONS.LOADER} size={60} />}
          subtext={t('Loading...')}
        />
      </div>
    );
  if (!isNew && !resolved) {
    return (
      <div
        className={'flex flex-col gap-2 mx-auto w-full'}
        style={{ maxWidth: 1360 }}
      >
        <Breadcrumb
          items={[
            { label: t('Actions'), to: backLink },
            { label: t('Not Found') },
          ]}
        />
        <NoContent
          show
          title={<AnimatedSVG name={ICONS.NO_RESULTS} size={60} />}
          subtext={t("Couldn't find anything")}
        />
      </div>
    );
  }

  const title = isNew ? t('New Action') : name;

  return (
    <div
      className={'flex flex-col gap-2 mx-auto w-full'}
      style={{ maxWidth: 1360 }}
    >
      <Breadcrumb
        items={[{ label: t('Actions'), to: backLink }, { label: title }]}
      />

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          {editing ? (
            <Input
              value={name}
              maxLength={128}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Action name')}
              className="font-semibold text-lg max-w-md"
            />
          ) : (
            <div className={'font-semibold text-xl'}>{title}</div>
          )}
          <div className="flex items-center gap-2">
            {isNew ? (
              <Button type="primary" disabled={!canSave} onClick={onSave}>
                {t('Create')}
              </Button>
            ) : editing ? (
              <>
                <Button onClick={onCancel}>{t('Cancel')}</Button>
                <Button type="primary" disabled={!canSave} onClick={onSave}>
                  {t('Save')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  icon={<Pencil size={14} />}
                  onClick={() => setEditing(true)}
                >
                  {t('Edit')}
                </Button>
                <Button danger onClick={onDelete}>
                  {t('Delete')}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="p-4">
          {editing ? (
            <Input.TextArea
              value={description}
              maxLength={256}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Action description')}
              rows={3}
            />
          ) : (
            <div className="text-lg">{description || t('No description')}</div>
          )}
        </div>
      </div>

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div className={'p-4'}>
          <FilterListHeader
            title={t('Events')}
            filterSelection={
              <FilterSelection
                disabled={!editing}
                filters={eventOptions}
                activeFilters={activeFilters}
                onFilterClick={onAddFilter}
              >
                <Button disabled={!editing} type="default" size="small">
                  <div className="flex items-center gap-1">
                    <Plus size={16} strokeWidth={1} />
                    <span>{t('Add')}</span>
                  </div>
                </Button>
              </FilterSelection>
            }
          />

          <UnifiedFilterList
            readonly={!editing}
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
