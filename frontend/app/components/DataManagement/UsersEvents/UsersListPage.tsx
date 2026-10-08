import withPageTitle from '@/components/hocs/withPageTitle';
import { IconButton } from '@/ui/actions/IconButton';
import { DisplayShell } from '@/ui/filters/DisplayMenu';
import { SearchField } from '@/ui/inputs/SearchField';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import withPermissions from 'HOCs/withPermissions';
import { BookOpen } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { debounce, numberWithCommas } from 'App/utils';

import {
  EntryField,
  FilterBar,
  buildFilterEditor,
  peopleTarget,
  useCatalogue,
} from 'Shared/FilterEditor';

import { DM_DOCS } from '../shared';
import PeopleTable, {
  NoPeople,
  PEOPLE_COLUMNS,
  peopleColumnLabels,
} from './components/PeopleTable';

const HIDDEN_KEY = '$__people_columns_hidden__$';

const readHidden = (): string[] => {
  try {
    return localStorage.getItem(HIDDEN_KEY)?.split(',').filter(Boolean) ?? [];
  } catch {
    return [];
  }
};

function UsersListPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore, analyticsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const [query, setQuery] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [hidden, setHidden] = React.useState<string[]>(readHidden);
  const all = useCatalogue(['users']);
  const entries = React.useMemo(() => all.filter((e) => !e.isEvent), [all]);
  const editor = buildFilterEditor(peopleTarget(analyticsStore));
  const noRules = editor.properties.length === 0;
  const labels = peopleColumnLabels(t);
  const push = React.useMemo(() => debounce(setSearch, 300), []);

  const open = (id: string, e: React.MouseEvent) => {
    const path = withSiteId(dataManagement.userPage(id), siteId!);
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(path, '_blank');
    else history.push(path);
  };

  const saveHidden = (next: string[]) => {
    setHidden(next);
    try {
      if (next.length) localStorage.setItem(HIDDEN_KEY, next.join(','));
      else localStorage.removeItem(HIDDEN_KEY);
    } catch {}
  };
  const toggleColumn = (key: string) => {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    if (next.length < PEOPLE_COLUMNS.length) saveHidden(next);
  };

  return (
    <PageCard
      title={t('People')}
      subtitle={t('Identified users and their sessions.')}
      actions={
        <>
          <SearchField
            placeholder={t('Search by name, email or ID')}
            value={query}
            onChange={(v) => {
              setQuery(v);
              push(v);
            }}
          />
          <IconButton
            icon={<BookOpen size={14} />}
            label={t('Documentation')}
            variant="ghost"
            onClick={() => window.open(DM_DOCS, '_blank')}
          />
        </>
      }
      split
    >
      <EntryField
        entries={entries}
        taken={editor.properties.map((f) => f.entry.id)}
        onPick={editor.onAdd}
        hasRules={!noRules}
        placeholder={t('Filter people')}
      />
      {!noRules && (
        <PagePanel spills>
          <FilterBar
            editor={editor}
            entries={entries}
            lead={t('Filter people')}
          />
        </PagePanel>
      )}
      <PagePanel
        head={
          <>
            <span className="m-dmg__count">
              {t('{{n}} people', {
                n: numberWithCommas(analyticsStore.users.total),
              })}
            </span>
            <span className="m-page__controls">
              <DisplayShell
                changeCount={hidden.length ? 1 : 0}
                onReset={() => saveHidden([])}
                rows={[]}
                fields={PEOPLE_COLUMNS.map((k) => ({
                  value: k,
                  label: labels[k],
                  on: !hidden.includes(k),
                }))}
                onToggleField={toggleColumn}
              />
            </span>
          </>
        }
      >
        <PeopleTable
          query={search}
          hidden={hidden}
          onOpen={open}
          empty={<NoPeople filtered={!noRules || !!search} />}
        />
      </PagePanel>
    </PageCard>
  );
}

export default withPageTitle('People')(
  withPermissions(
    ['DATA_MANAGEMENT'],
    '',
    false,
    false,
  )(observer(UsersListPage)),
);
