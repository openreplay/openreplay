import { Filter } from '@/mstore/types/filterConstants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ENV from 'ENV';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input, Segmented, Tooltip } from 'antd';
import cn from 'classnames';
import { Filter as FilterIcon, Lock, Plus, Trash, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { dataManagement, sessions, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';
import { CopyButton, NoContent, confirm } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Breadcrumb from 'Shared/Breadcrumb';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';

import {
  Segment,
  createSegment,
  deleteSegment,
  fetchSegment,
  updateSegment,
} from './api';

function SegmentPage() {
  const { t } = useTranslation();
  const { segmentId } = useParams<{ segmentId: string }>();
  const isNew = segmentId === 'new';
  const history = useHistory();
  const queryClient = useQueryClient();
  const { projectsStore, filterStore, userStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const backLink = withSiteId(dataManagement.segments(), siteId);
  const currentUserId = userStore.account.id;

  const { data: segment, isPending } = useQuery({
    queryKey: ['segment', siteId, segmentId],
    queryFn: () => fetchSegment(segmentId!),
    enabled: !isNew && !!segmentId,
  });

  const resolved = isNew ? new Segment() : segment;

  const [isEditing, setIsEditing] = React.useState(false);
  const [parsed, setParsed] = React.useState(false);
  const [name, setName] = React.useState('');
  const [nameEditing, setNameEditing] = React.useState(isNew);
  const nameInputRef = React.useRef<any>(null);
  const [isPublic, setIsPublic] = React.useState(false);
  const [filters, setFilters] = React.useState<Filter[]>([]);

  React.useEffect(() => {
    setParsed(false);
    setIsEditing(false);
  }, [segmentId]);

  React.useEffect(() => {
    if (nameEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [nameEditing]);

  React.useEffect(() => {
    if (resolved && !parsed) {
      setName(resolved.name ?? '');
      setIsPublic(Boolean(resolved.isPublic));
      setFilters(resolved.filters as unknown as Filter[]);
      setParsed(true);
    }
  }, [resolved, parsed]);

  const allFilterOptions = filterStore.getScopedCurrentProjectFilters([
    'events',
    'sessions',
  ]);
  const eventOptions = allFilterOptions.filter(
    (i) => i.isEvent && i.category !== 'segments',
  );
  const filterOptions = allFilterOptions.filter((i) => !i.isEvent);
  const activeFilters = filters.map((f) => f.name);

  const createMutation = useMutation({
    mutationFn: createSegment,
    onSuccess: (created) => {
      toast.success(
        t('Segment {{name}} created successfully', { name: created.name }),
      );
      queryClient.invalidateQueries({ queryKey: ['segments-list'] });
      history.push(withSiteId(dataManagement.segmentPage(created.id), siteId!));
    },
    onError: () => {
      toast.error(t('Failed to create segment. Please try again.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Pick<Segment, 'name' | 'isPublic' | 'filters'>) =>
      updateSegment(segmentId!, payload),
    onSuccess: () => {
      toast.success(t('Segment updated successfully'));
      queryClient.invalidateQueries({ queryKey: ['segments-list'] });
      queryClient.invalidateQueries({
        queryKey: ['segment', siteId, segmentId],
      });
    },
    onError: () => {
      toast.error(t('Failed to update segment. Please try again.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSegment(segmentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments-list'] });
      history.push(backLink);
    },
    onError: () => {
      toast.error(t('Failed to delete segment. Please try again.'));
    },
  });

  const canSave = name.trim().length > 0 && filters.length > 0;

  const onCreate = () => {
    if (!canSave) return;
    createMutation.mutate({ name, isPublic, filters } as unknown as Pick<
      Segment,
      'name' | 'isPublic' | 'filters'
    >);
  };

  const onNameBlur = () => {
    setNameEditing(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setName(resolved?.name || t('New Segment'));
    } else if (!isNew && trimmed !== resolved?.name) {
      updateMutation.mutate({
        name: trimmed,
        isPublic,
        filters,
      } as unknown as Pick<Segment, 'name' | 'isPublic' | 'filters'>);
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

  const onTogglePublic = (next: boolean) => {
    setIsPublic(next);
    if (!isNew) {
      updateMutation.mutate({
        name,
        isPublic: next,
        filters,
      } as unknown as Pick<Segment, 'name' | 'isPublic' | 'filters'>);
    }
  };

  const onSave = () => {
    if (!canSave) return;
    updateMutation.mutate({ name, isPublic, filters } as unknown as Pick<
      Segment,
      'name' | 'isPublic' | 'filters'
    >);
    setIsEditing(false);
  };

  const onCancel = () => {
    setName(resolved?.name ?? '');
    setIsPublic(Boolean(resolved?.isPublic));
    setFilters((resolved?.filters as unknown as Filter[]) ?? []);
    setIsEditing(false);
  };

  const onDelete = async () => {
    const confirmed = await confirm({
      header: t('Delete Segment'),
      confirmation: t(
        'Are you sure you want to permanently delete this segment?',
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

  const eventFilters = filters.filter((f) => f.isEvent);
  const propertyFilters = filters.filter((f) => !f.isEvent);
  const isOwner =
    isNew ||
    resolved?.userId === undefined ||
    String(resolved.userId) === String(currentUserId);
  const readonly = (!isEditing && !isNew) || !isOwner;

  if (!isNew && isPending)
    return (
      <div
        className={'flex flex-col gap-2 mx-auto w-full'}
        style={{ maxWidth: 1360 }}
      >
        <Breadcrumb
          items={[
            { label: t('Segments'), to: backLink },
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
            { label: t('Segments'), to: backLink },
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

  const title = isNew ? t('New Segment') : name;
  return (
    <div
      className={'flex flex-col gap-2 mx-auto w-full'}
      style={{ maxWidth: 1360 }}
    >
      <Breadcrumb
        items={[{ label: t('Segments'), to: backLink }, { label: title }]}
      />

      <div className={'rounded-lg border bg-white'}>
        <div
          className={'p-4 border-b w-full flex items-center justify-between'}
        >
          {nameEditing && isOwner ? (
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={onNameBlur}
              onKeyDown={onNameKeyDown}
              maxLength={40}
              className="bg-white text-xl font-semibold ps-2 rounded-lg h-8"
              placeholder={t('Segment Name')}
            />
          ) : (
            // @ts-ignore
            <Tooltip
              mouseEnterDelay={isOwner ? 1 : 0}
              title={
                isOwner
                  ? t('Click to edit')
                  : t('Only the segment owner can edit this segment')
              }
            >
              <div
                onClick={() => isOwner && setNameEditing(true)}
                className={cn(
                  'text-xl font-semibold h-8 flex items-center p-2 rounded-lg',
                  isOwner
                    ? 'cursor-pointer select-none ps-2 hover:bg-teal/10'
                    : 'select-none ps-2',
                )}
              >
                {name || t('New Segment')}
              </div>
            </Tooltip>
          )}
          <div className="flex items-center gap-2">
            {isNew ? (
              <Button type="primary" disabled={!canSave} onClick={onCreate}>
                {t('Create')}
              </Button>
            ) : (
              <>
                <CopyButton
                  isIcon
                  isShare
                  content={`https://${ENV.ORIGIN}/${siteId}${sessions()}?sid=${segmentId}`}
                  copyText={[t('Share Segment'), t('Link Copied!')]}
                />
                {isOwner && (
                  <Button size="small" type="text" onClick={onDelete}>
                    <Trash size={14} />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="font-semibold">{t('Visibility')}</span>
          {/* @ts-ignore */}
          <Tooltip
            title={
              isOwner ? '' : t('Only the segment owner can edit this segment')
            }
          >
            <Segmented
              value={isPublic ? 'team' : 'personal'}
              onChange={(v) => onTogglePublic(v === 'team')}
              disabled={!isOwner}
              size="small"
              options={[
                {
                  label: (
                    <div className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{t('Team')}</span>
                    </div>
                  ),
                  value: 'team',
                },
                {
                  label: (
                    <div className="flex items-center gap-1.5">
                      <Lock size={14} />
                      <span>{t('Personal')}</span>
                    </div>
                  ),
                  value: 'personal',
                },
              ]}
            />
          </Tooltip>
        </div>
      </div>

      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div className={'p-4'}>
          <FilterListHeader
            title={<div className="font-semibold text-lg">{t('Events')}</div>}
            extra={
              isNew || !isOwner ? null : isEditing ? (
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
                disabled={readonly}
                type="Events"
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
            readonly={readonly}
            title={t('Events')}
            filters={eventFilters}
            isDraggable={true}
            showIndices={true}
            className="mt-2"
            handleRemove={(i) =>
              onRemoveFilter(filters.indexOf(eventFilters[i]))
            }
            handleUpdate={(i, f) =>
              onUpdateFilter(filters.indexOf(eventFilters[i]), f)
            }
            handleAdd={onAddFilter}
            scope={'events'}
          />
        </div>

        <div className={'p-4 border-t'}>
          <FilterListHeader
            title={<div className="font-semibold text-lg">{t('Filters')}</div>}
            filterSelection={
              <FilterSelection
                filters={filterOptions}
                activeFilters={activeFilters}
                onFilterClick={onAddFilter}
                disabled={readonly}
                type="Filters"
              >
                <Button type="default" size="small">
                  <div className="flex items-center gap-1">
                    <FilterIcon size={16} strokeWidth={1} />
                    <span>{t('Add')}</span>
                  </div>
                </Button>
              </FilterSelection>
            }
          />

          <UnifiedFilterList
            readonly={readonly}
            title={t('Filters')}
            filters={propertyFilters}
            isDraggable={false}
            showIndices={false}
            className="mt-2"
            handleRemove={(i) =>
              onRemoveFilter(filters.indexOf(propertyFilters[i]))
            }
            handleUpdate={(i, f) =>
              onUpdateFilter(filters.indexOf(propertyFilters[i]), f)
            }
            handleAdd={onAddFilter}
            scope={'sessions'}
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
)(observer(SegmentPage));
