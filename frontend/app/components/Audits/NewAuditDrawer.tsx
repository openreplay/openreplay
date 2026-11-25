import { Button } from '@/ui/actions/button';
import { AiAccessDialog } from '@/ui/ai/AiAccessDialog';
import { AiLockedRow } from '@/ui/ai/AiLockedRow';
import { DateRange } from '@/ui/inputs/DateRange';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { Segmented } from '@/ui/inputs/toggle-group';
import {
  DrawerFooter,
  EntityDrawer,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQuery } from '@tanstack/react-query';
import Period, { LAST_7_DAYS, LAST_30_DAYS } from 'Types/app/period';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { mapSegments } from 'App/components/DataManagement/Segments/api';
import { useStore } from 'App/mstore';
import FilterModel from 'App/mstore/types/filter';

import {
  FilterBar,
  buildFilterEditor,
  isNullary,
  seriesTarget,
  useCatalogue,
} from 'Shared/FilterEditor';

import { SectionIcon } from './SectionIcon';
import { hasArmadaAccess } from './access';
import {
  AUDIT_PERIODS,
  type AuditDraft,
  type AuditScope,
  CHAPTERS,
  type ChapterKey,
  canEstimate,
  draftProblem,
  orderChapters,
  periodName,
  toCreateRequest,
  usableChapters,
} from './model';
import './new-audit-drawer.css';
import { useAuditEstimate, useCreateAudit } from './queries';
import type { AuditFilter, PeriodDays } from './types';

// one segment until the API takes more (design: up to 3)
const MAX_SEGMENTS = 1;

const RANGE_OF: Record<number, string> = { 7: LAST_7_DAYS, 30: LAST_30_DAYS };
const DAYS_OF: Record<string, PeriodDays> = {
  [LAST_7_DAYS]: 7,
  [LAST_30_DAYS]: 30,
};

const fmt = (n: number) => n.toLocaleString('en-US');

const hasValue = (f: { operator?: string; value?: unknown[] }) =>
  isNullary(f.operator ?? '') ||
  (f.value ?? []).some((v) => v !== '' && v != null);

interface Props {
  open: boolean;
  onClose: () => void;
  /** after the audit is created (the drawer closes itself) */
  onCreated?: () => void;
}

function NewAuditDrawer({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { projectsStore, searchStore, userStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const me = Number(userStore.account?.id);
  const hasAi = hasArmadaAccess();

  const [name, setName] = React.useState('');
  const [scope, setScope] = React.useState<AuditScope>('full');
  const [segmentIds, setSegmentIds] = React.useState<string[]>([]);
  const [period, setPeriod] = React.useState(() =>
    Period({ rangeName: RANGE_OF[AUDIT_PERIODS[0]] }),
  );
  const [chapters, setChapters] = React.useState<ChapterKey[]>(() =>
    usableChapters(hasAi),
  );
  const [aiInfo, setAiInfo] = React.useState(false);
  const [filter] = React.useState(() => new FilterModel());
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const editor = buildFilterEditor(seriesTarget(filter, bump));
  const catalogue = useCatalogue(['sessions']);
  const entries = React.useMemo(
    () => catalogue.filter((e) => !e.isEvent),
    [catalogue],
  );

  const { data: segments = [] } = useQuery({
    queryKey: ['segments-list', siteId],
    queryFn: async () => {
      await searchStore.ensureSavedSearchList(true);
      return mapSegments(searchStore.savedSearchRaw);
    },
    enabled: open && !!siteId,
  });
  const segmentOptions = React.useMemo(() => {
    const mine = segments.filter((s) => s.userId === me);
    const team = segments.filter((s) => s.userId !== me);
    return [...mine, ...team].map((s) => ({ value: s.id, label: s.name }));
  }, [segments, me]);

  const rules = filter.filters.filter((f) => !f.isEvent);
  const unfinished =
    scope === 'full' ? rules.filter((f) => !hasValue(f)).length : 0;
  const draft: AuditDraft = {
    name,
    scope,
    segmentId: segmentIds[0],
    filters: rules
      .filter((f) => hasValue(f))
      .map((f) => f.toJson() as AuditFilter),
    periodDays: DAYS_OF[period.rangeName] ?? AUDIT_PERIODS[0],
    chapters,
  };
  const request = toCreateRequest(draft, hasAi);
  const estimate = useAuditEstimate(
    open && canEstimate(draft) ? { ...request, name: undefined } : null,
  );
  const matched = estimate.data?.matchedSessions;
  const create = useCreateAudit();

  const problem = draftProblem(draft, hasAi, unfinished);
  const why =
    problem === 'name'
      ? t('Give it a name first')
      : problem === 'segment'
        ? t('Pick a segment')
        : problem === 'unfinishedFilters'
          ? t('{{n}} filters need a value', {
              n: unfinished,
              count: unfinished,
            })
          : problem === 'sections'
            ? t('Pick at least one section')
            : matched === 0
              ? t('No sessions match this scope in the period')
              : undefined;

  const pickSegments = (next: string[]) =>
    setSegmentIds(
      next.length > MAX_SEGMENTS
        ? next.filter((id) => !segmentIds.includes(id)).slice(-MAX_SEGMENTS)
        : next,
    );

  const generate = () =>
    create.mutate(request, {
      onSuccess: () => {
        toast.success(t('Audit started, ready in a few minutes'));
        onCreated?.();
        onClose();
      },
      onError: (e) => toast.error(e.message),
    });

  const job = !canEstimate(draft) ? (
    <span className="m-nad__job-note">{t('Pick a segment')}</span>
  ) : estimate.isPending ? (
    <span className="m-nad__job-note">{t('Counting sessions…')}</span>
  ) : matched == null ? (
    <span className="m-nad__job-note">
      {t('The session count isn’t available right now')}
    </span>
  ) : (
    <span className="m-nad__job-total">
      <span className="num">{fmt(matched)}</span> {t('sessions')}
    </span>
  );

  const usable = usableChapters(hasAi);
  const allUsable = usable.length;

  return (
    <EntityDrawer
      size="wide"
      open={open}
      onClose={onClose}
      title={name}
      onTitleChange={setName}
      autoEditTitle
      namePlaceholder={t('Name this audit')}
      eyebrow={t('Audit · New')}
      footer={
        <DrawerFooter
          left={
            <div className="m-nad__job" aria-live="polite">
              {job}
            </div>
          }
          right={
            <>
              <Button onClick={onClose}>{t('Cancel')}</Button>
              <Tooltip title={why}>
                <span>
                  <Button
                    variant="primary"
                    disabled={why != null || create.isPending}
                    loading={create.isPending}
                    onClick={generate}
                  >
                    {t('Generate audit')}
                  </Button>
                </span>
              </Tooltip>
            </>
          }
        />
      }
    >
      <Section
        title={t('Sessions')}
        hint={t('What the report counts: the full traffic, or a segment.')}
      >
        <div className="m-nad__stack">
          <Segmented<AuditScope>
            value={scope}
            onChange={setScope}
            ariaLabel={t('Which sessions')}
            options={[
              { value: 'full', label: t('Full traffic') },
              { value: 'segment', label: t('Segment') },
            ]}
          />
          {scope === 'full' ? (
            <div className="m-nad__filters">
              <p className="m-nad__label">{t('Only sessions that match')}</p>
              <FilterBar
                variant="panel"
                emptyAs="button"
                editor={editor}
                entries={entries}
                lead={t('Add filter')}
                ariaLabel={t('Session filters')}
              />
            </div>
          ) : (
            <div className="m-nad__filters">
              <p className="m-nad__label">
                {t('Its own rules decide which sessions the report reads')}
              </p>
              <MultiSelect<string>
                className="m-nad__segment"
                value={segmentIds}
                onChange={pickSegments}
                placeholder={t('Pick a segment')}
                ariaLabel={t('Segment')}
                searchable={{
                  placeholder: t('Search segments'),
                  empty: t('No segments yet'),
                }}
                options={segmentOptions}
              />
            </div>
          )}
        </div>
      </Section>

      <Section
        title={t('Period')}
        hint={t('Compared with the same length of time just before.')}
      >
        <DateRange
          field={t('Period')}
          period={period}
          onChange={setPeriod}
          resting={RANGE_OF[AUDIT_PERIODS[0]]}
          disableCustom
          options={AUDIT_PERIODS.map((d) => ({
            value: RANGE_OF[d],
            label: periodName(d),
          }))}
        />
      </Section>

      <Section
        title={t('Sections')}
        hint={t('What the report covers. Each one is a chapter of its slides.')}
      >
        <MultiSelect<ChapterKey>
          className="m-nad__sections-pick"
          value={chapters}
          onChange={(next) => setChapters(orderChapters(next, hasAi))}
          placeholder={t('Pick sections')}
          ariaLabel={t('Report sections')}
          allLabel={t('All {{n}} sections', { n: allUsable })}
          options={CHAPTERS.map((c) => {
            const label = (
              <span className="m-nad__sec">
                <span className="m-nad__sec-name">{t(c.name)}</span>
                <span className="m-nad__sec-brief">{t(c.brief)}</span>
              </span>
            );
            return {
              value: c.key,
              label,
              text: t(c.name),
              icon: <SectionIcon section={c.key} />,
              locked: usable.includes(c.key) ? undefined : (
                <AiLockedRow
                  compact
                  icon={<SectionIcon section={c.key} />}
                  onUnlock={() => setAiInfo(true)}
                >
                  {label}
                </AiLockedRow>
              ),
            };
          })}
        />
      </Section>
      <AiAccessDialog open={aiInfo} onClose={() => setAiInfo(false)} />
    </EntityDrawer>
  );
}

export default observer(NewAuditDrawer);
