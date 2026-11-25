import type { ActiveFilterChip } from '@/ui/filters/ActiveFilters';
import { type FilterDimension, FilterMenu } from '@/ui/filters/FilterMenu';
import type { FilterStripProps } from '@/ui/filters/FilterStrip';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, LayoutList, Split, User } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { mapSegments } from 'App/components/DataManagement/Segments/api';
import { useStore } from 'App/mstore';

import { SectionIcon } from './SectionIcon';
import {
  AUDIT_PERIODS,
  type AuditItem,
  CHAPTERS,
  FULL_TRAFFIC,
  periodName,
} from './model';
import { type AuditFilterKey, auditsUi as ui } from './store';

/**
 * The list's filter dimensions. Creators are the people seen on loaded rows (and you):
 * the team list needs admin rights, and a refused call ends the session.
 */
export function useAuditFilters(items: readonly AuditItem[] | undefined) {
  const { t } = useTranslation();
  const { projectsStore, searchStore, userStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const me = Number(userStore.account?.id);

  const { data: segments = [] } = useQuery({
    queryKey: ['segments-list', siteId],
    queryFn: async () => {
      await searchStore.ensureSavedSearchList(true);
      return mapSegments(searchStore.savedSearchRaw);
    },
    enabled: !!siteId,
  });

  const names = new Map<number, string>();
  items?.forEach((a) => {
    if (a.raw.userName) names.set(a.raw.userId, a.raw.userName);
  });
  const picked = ui.filters.userId;
  if (picked != null && picked !== me && !names.has(picked))
    names.set(picked, t('User {{id}}', { id: picked }));
  const creators = [...names.entries()]
    .filter(([id]) => id !== me)
    .sort((a, b) => a[1].localeCompare(b[1]));

  const dimensions: FilterDimension<AuditFilterKey>[] = [
    {
      key: 'segment',
      label: t('Scope'),
      hint: t('The traffic the audit read'),
      icon: <Split size={13} />,
      single: true,
      options: [
        { value: FULL_TRAFFIC, label: t('Full traffic') },
        ...segments.map((s) => ({ value: s.id, label: s.name })),
      ],
    },
    {
      key: 'period',
      label: t('Period'),
      icon: <CalendarClock size={13} />,
      single: true,
      options: AUDIT_PERIODS.map((d) => ({
        value: String(d),
        label: t(periodName(d)),
      })),
    },
    {
      key: 'creator',
      label: t('Created by'),
      icon: <User size={13} />,
      single: true,
      options: [
        ...(Number.isFinite(me)
          ? [{ value: String(me), label: t('You') }]
          : []),
        ...creators.map(([id, name]) => ({ value: String(id), label: name })),
      ],
    },
    {
      key: 'chapters',
      label: t('Sections'),
      hint: t('Audits that cover all you pick'),
      icon: <LayoutList size={13} />,
      options: CHAPTERS.map((c) => ({
        value: c.key,
        label: t(c.name),
        icon: <SectionIcon section={c.key} size={13} />,
      })),
    },
  ];

  const chips: ActiveFilterChip<AuditFilterKey>[] = dimensions.flatMap((d) =>
    d.options
      .filter((o) => ui.isFilterActive(d.key, o.value))
      .map((o) => ({
        key: d.key,
        value: o.value,
        dimension: d.label,
        label: o.label,
      })),
  );

  return { dimensions, chips };
}

function AuditsFilterMenu({
  dimensions,
  strip,
}: {
  dimensions: FilterDimension<AuditFilterKey>[];
  strip?: FilterStripProps;
}) {
  const { t } = useTranslation();
  return (
    <FilterMenu<AuditFilterKey>
      dimensions={dimensions}
      isActive={ui.isFilterActive}
      onToggle={ui.toggleFilter}
      activeCount={ui.filterCount}
      strip={strip}
      label={t('Filter audits')}
    />
  );
}

export default observer(AuditsFilterMenu);
