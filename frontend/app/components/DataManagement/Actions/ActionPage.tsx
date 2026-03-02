import { Filter } from '@/mstore/types/filterConstants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input, Tooltip } from 'antd';
import cn from 'classnames';
import { Plus, Trash } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';
import { EditableField } from 'Components/DataManagement/DataItemPage';
import { NoContent, confirm } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Breadcrumb from 'Shared/Breadcrumb';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';

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
    queryFn: () => fetchAction(actionId!),
    enabled: !isNew && !!actionId,
  });

  const resolved = isNew ? new Action() : action;

  const [isEditing, setIsEditing] = React.useState(false);
  const [parsed, setParsed] = React.useState(false);
  const [name, setName] = React.useState('');
  const [nameEditing, setNameEditing] = React.useState(isNew);
  const nameInputRef = React.useRef<any>(null);
  const [description, setDescription] = React.useState('');
  const [filters, setFilters] = React.useState<Filter[]>([]);

  React.useEffect(() => {
    if (nameEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [nameEditing]);

  React.useEffect(() => {
    if (resolved && !parsed) {
      setName(resolved.name ?? '');
      setDescription(resolved.description ?? '');
      setFilters(resolved.filters as unknown as Filter[]);
      setParsed(true);
    }
  }, [resolved, parsed]);

  const allFilterOptions = filterStore.getScopedCurrentProjectFilters([
    'events',
  ]);
  const eventOptions = allFilterOptions.filter(
    (i) => i.isEvent && i.category !== 'actions',
  );
  const activeFilters = filters.map((f) => f.name);

  const createMutation = useMutation({
    mutationFn: createAction,
    onSuccess: (created) => {
      toast.success(`Action ${created.name} created successfully`);
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
      toast.success(t('Action updated successfully'));
      queryClient.invalidateQueries({ queryKey: ['actions-list'] });
      queryClient.invalidateQueries({ queryKey: ['action', siteId, actionId] });
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

  const onCreate = () => {
    if (!canSave) return;
    createMutation.mutate({
      name,
      description,
      filters,
    } as unknown as Pick<Action, 'name' | 'description' | 'filters'>);
  };

  const onSaveField = ({ key, value }: { key: string; value: string }) => {
    if (key === 'name') setName(value);
    else if (key === 'description') setDescription(value);
    if (!isNew) {
      updateMutation.mutate({
        name: key === 'name' ? value : name,
        description: key === 'description' ? value : description,
        filters,
      } as unknown as Pick<Action, 'name' | 'description' | 'filters'>);
    }
  };

  const onNameBlur = () => {
    setNameEditing(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setName(resolved?.name || t('New Action'));
    } else if (!isNew) {
      onSaveField({ key: 'name', value: trimmed });
    }
  };

  const onNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onNameBlur();
    }
    if (e.key === 'Escape') {
      setName(resolved?.name ?? '');
      setNameEditing(false);
    }
  };

  const onSave = () => {
    if (!canSave) return;
    updateMutation.mutate({
      name,
      description,
      filters,
    } as unknown as Pick<Action, 'name' | 'description' | 'filters'>);
    setIsEditing(false);
  };

  const onCancel = () => {
    setName(resolved?.name ?? '');
    setDescription(resolved?.description ?? '');
    setFilters((resolved?.filters as unknown as Filter[]) ?? []);
    setIsEditing(false);
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

  const onUpdateFilter = async (index: number, filter: Filter) => {
    const isReplacing = filters[index].name !== filter.name;
    if (isReplacing) {
      if (filter.isEvent && (!filter.filters || filter.filters.length === 0)) {
        const props = await filterStore.getEventFilters(filter.id);
        filter.filters = props?.filter((prop: any) => prop.defaultProperty);
      }
    }
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

      <div className={'rounded-lg border bg-white'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          {nameEditing ? (
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={onNameBlur}
              onKeyDown={onNameKeyDown}
              maxLength={40}
              className="bg-white text-xl font-semibold ps-2 rounded-lg h-8"
              placeholder={t('Action Name')}
            />
          ) : (
            // @ts-ignore
            <Tooltip mouseEnterDelay={1} title={t('Click to edit')}>
              <div
                onClick={() => setNameEditing(true)}
                className={cn(
                  'text-xl font-semibold h-8 flex items-center p-2 rounded-lg',
                  'cursor-pointer select-none ps-2 hover:bg-teal/10',
                )}
              >
                {name || t('New Action')}
              </div>
            </Tooltip>
          )}
          <div className="flex items-center gap-2">
            {isNew ? (
              <Button type="primary" disabled={!canSave} onClick={onCreate}>
                {t('Create')}
              </Button>
            ) : (
              <Button size="small" type="text" onClick={onDelete}>
                <Trash size={14} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col py-2">
          <EditableField
            key={`desc-${resolved?.id}`}
            onSave={onSaveField}
            fieldName={t('Description')}
            rawName="description"
            value={description}
          />
        </div>
      </div>

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div className={'p-4'}>
          <FilterListHeader
            title={<div className="font-semibold text-lg">{t('Events')}</div>}
            extra={
              isNew ? null : isEditing ? (
                <div className="flex items-center gap-2">
                  <Button size="small" onClick={onSave}>
                    {t('Save')}
                  </Button>
                  <Button size="small" type="text" onClick={onCancel}>
                    {t('Cancel')}
                  </Button>
                </div>
              ) : (
                <Button size="small" onClick={() => setIsEditing(true)}>
                  {t('Edit')}
                </Button>
              )
            }
            filterSelection={
              <FilterSelection
                filters={eventOptions}
                activeFilters={activeFilters}
                onFilterClick={onAddFilter}
                disabled={!isEditing && !isNew}
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
            readonly={!isEditing && !isNew}
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
