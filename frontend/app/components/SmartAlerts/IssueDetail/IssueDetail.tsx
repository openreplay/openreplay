import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { Button } from '@/ui/actions/button';
import { BrandMark } from '@/ui/brand/BrandMark';
import { CountSuffix } from '@/ui/data/CountSuffix';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { type FilterDimension, FilterMenu } from '@/ui/filters/FilterMenu';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Info, Search, Split, Tag as TagIcon, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import { smartIssueSession, smartIssues, withSiteId } from 'App/saasComponents';
import { ReplayScreen } from 'Components/Session/ReplayScreen/ReplayScreen';

import { syncScopeToUrl } from '../segments/SegmentScope';
import {
  CriticalDialog,
  HideIssueModal,
  type IssueSessionCard,
  JOURNEY_SEARCH_SUGGESTIONS,
  NotCriticalDialog,
  RenameIssueModal,
} from '../shared';
import type { MatchMode } from '../shared/model';
import IssueActions from './IssueActions';
import IssueWriteUp from './IssueWriteUp';
import SessionCard from './SessionCard';
import './session-strip.css';

const STEP = 3;
const MAX_EXAMPLES = 10;
type Key = 'tags' | 'segments';

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  const id = params.issueId ? decodeURIComponent(params.issueId) : '';
  const idParam = params.issueId ?? '';
  const issue = issuesStore.byId(id);

  const [hideOpen, setHideOpen] = React.useState(false);
  const [critOpen, setCritOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [notCritOpen, setNotCritOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(STEP);

  const filterKey = `${issuesStore.detailScope.join(',')}|${
    issuesStore.detailMatch
  }:${issuesStore.detailLabels.join(',')}`;

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);
  React.useEffect(() => {
    if (id) void issuesStore.loadIssue(id);
  }, [id]);
  // seed the sessions-only filters from the issue; a shared ?seg= wins for scope
  React.useEffect(() => {
    const seg = new URLSearchParams(window.location.search).get('seg');
    if (seg) issuesStore.setDetailScope(seg.split(',').filter(Boolean));
    else {
      issuesStore.setDetailScope(issue?.segmentIds ?? []);
      syncScopeToUrl(issuesStore.detailScope);
    }
    issuesStore.setDetailMatch('any');
    issuesStore.setDetailLabels(issue?.journeyLabels ?? []);
    return () => {
      issuesStore.clearDetailScope();
      issuesStore.clearDetailLabels();
    };
  }, [issue?.id]);
  React.useEffect(() => {
    if (issue) void issuesStore.loadSessions(issue.id, searchQuery);
  }, [issue?.id, searchQuery, filterKey]);

  const ql = query.trim().toLowerCase();
  const suggestions = React.useMemo(
    () =>
      ql
        ? JOURNEY_SEARCH_SUGGESTIONS.filter(
            (s) => s.toLowerCase().includes(ql) && s.toLowerCase() !== ql,
          ).slice(0, 6)
        : [],
    [ql],
  );

  const back = () => history.push(withSiteId(smartIssues(), siteId));
  const sessionPath = (s: IssueSessionCard) =>
    withSiteId(smartIssueSession(idParam, s.sessionId), siteId);
  const openReplay = (s: IssueSessionCard) =>
    history.push(
      sessionPath(s) + (s.issueTimestamp ? `?jumpto=${s.issueTimestamp}` : ''),
    );

  const screen = (children: React.ReactNode, actions?: React.ReactNode) => (
    <ReplayScreen
      back={{ label: t('Issues'), onClick: back }}
      lead={
        <nav className="m-ihdr__crumb" aria-label={t('Breadcrumb')}>
          <span>{t('This issue')}</span>
        </nav>
      }
      actions={actions}
    >
      {children}
    </ReplayScreen>
  );

  if (!issue)
    return screen(
      <EmptyState
        art="issues"
        title={
          issuesStore.loading || issuesStore.isLoadingIssue(id)
            ? t('Loading…')
            : t('Issue not found')
        }
      />,
    );

  const sessions = issuesStore.exampleSessions(issue.id, searchQuery);
  const total = issuesStore.sessionsCount(issue.id, searchQuery);
  const loadingSessions = issuesStore.isLoadingSessions(issue.id, searchQuery);
  const maxExamples = Math.min(MAX_EXAMPLES, sessions.length);
  const shown = sessions.slice(0, Math.min(visibleCount, maxExamples));
  const filtered =
    issuesStore.detailScope.length > 0 || issuesStore.detailLabels.length > 0;

  const runSearch = (v: string) => {
    setQuery(v);
    setSearchQuery(v.trim());
    setVisibleCount(STEP);
  };
  const clearFilters = () => {
    issuesStore.clearDetailScope();
    issuesStore.clearDetailLabels();
    syncScopeToUrl([]);
  };

  const matchFooter = (value: MatchMode, set: (m: MatchMode) => void) => (
    <span className="ml-auto inline-flex items-center gap-2">
      {t('Match')}
      <Segmented
        value={value}
        onChange={(v) => set(v as MatchMode)}
        ariaLabel={t('Match')}
        options={[
          { value: 'any', label: t('Any') },
          { value: 'all', label: t('All') },
        ]}
      />
    </span>
  );
  const dimensions: FilterDimension<Key>[] = [
    {
      key: 'tags',
      label: t('Tags'),
      icon: <TagIcon size={14} />,
      options: issuesStore.allTags.map((tag) => ({ value: tag, label: tag })),
      footer:
        issuesStore.detailLabels.length > 1
          ? matchFooter(issuesStore.detailMatch, issuesStore.setDetailMatch)
          : undefined,
    },
    ...(issuesStore.originSegments.length
      ? [
          {
            key: 'segments' as Key,
            label: t('Segments'),
            icon: <Split size={14} />,
            options: issuesStore.originSegments.map((s) => ({
              value: s.id,
              label: s.name,
              icon: <Split size={13} />,
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      {screen(
        <div className="m-work__scroll">
          <IssueWriteUp issue={issue} title={issue.head} />
          <section
            className="m-strip m-strip--cards"
            aria-label={t('Sessions that hit this issue')}
          >
            <header className="m-strip__head">
              <h2 className="m-strip__label">
                {t('Sessions that hit it')}
                {shown.length === total ? (
                  <CountSuffix n={total} />
                ) : (
                  <span className="m-strip__of">
                    {t('{{shown}} of {{total}}', {
                      shown: shown.length,
                      total: total.toLocaleString(),
                    })}
                  </span>
                )}
                <Tooltip
                  title={t(
                    'A sample of the sessions where the agent detected this issue, not the full set. Search or load more to see other examples.',
                  )}
                >
                  <Info
                    size={13}
                    className="self-center text-content-decorative"
                  />
                </Tooltip>
              </h2>
              {!searching && (
                <p className="m-strip__hint">
                  {t('Pick the one you want to watch.')}
                </p>
              )}
              <div className="m-strip__tools">
                {searching || searchQuery ? (
                  <div className="m-strip__search relative">
                    <Search
                      size={13}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-content-decorative"
                    />
                    <Input
                      autoFocus
                      className="pl-7 pr-7"
                      placeholder={t('Describe the journey to find…')}
                      aria-label={t('Search these sessions')}
                      value={query}
                      maxLength={256}
                      onChange={(e) => setQuery(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') runSearch(query);
                        if (e.key === 'Escape') {
                          runSearch('');
                          setSearching(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-content-decorative hover:text-content-primary"
                      aria-label={t('Close the search')}
                      onClick={() => {
                        runSearch('');
                        setSearching(false);
                      }}
                    >
                      <X size={13} />
                    </button>
                    {suggestions.length > 0 && (
                      <ul className="m-strip__suggest m-pop m-elevated">
                        {suggestions.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                runSearch(s);
                              }}
                            >
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Tooltip title={t('Search these sessions')}>
                    <span>
                      <Button
                        size="icon"
                        aria-label={t('Search these sessions')}
                        onClick={() => setSearching(true)}
                      >
                        <Search size={15} />
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <FilterMenu<Key>
                  dimensions={dimensions}
                  label={t('Filter these sessions')}
                  isActive={(key, value) =>
                    key === 'tags'
                      ? issuesStore.detailLabels.includes(value)
                      : issuesStore.detailScope.includes(value)
                  }
                  onToggle={(key, value) => {
                    if (key === 'tags') issuesStore.toggleDetailLabel(value);
                    else {
                      issuesStore.toggleDetailScope(value);
                      syncScopeToUrl(issuesStore.detailScope);
                    }
                  }}
                  activeCount={
                    issuesStore.detailLabels.length +
                    issuesStore.detailScope.length
                  }
                />
              </div>
            </header>

            {loadingSessions ? (
              <div className="m-strip__loading">
                <div className="m-strip__rail" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="m-scard m-scard--skeleton">
                      <span className="m-scard__frame m-skeleton" />
                      <span className="m-skeleton h-3 w-3/4" />
                      <span className="m-skeleton h-3 w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="m-strip__scrim">
                  <span className="inline-flex flex-col items-center gap-2 text-xs text-content-muted">
                    <BrandMark size={22} loop />
                    {t('Searching journeys…')}
                  </span>
                </div>
              </div>
            ) : shown.length === 0 ? (
              <EmptyState
                title={
                  filtered
                    ? t('No sampled session matches these filters')
                    : searchQuery
                      ? t('No session matches this search')
                      : t('No example sessions yet')
                }
                action={
                  filtered ? (
                    <Button onClick={clearFilters}>{t('Clear filters')}</Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="m-strip__rail">
                  {shown.map((s) => (
                    <SessionCard
                      key={s.sessionId}
                      s={s}
                      onClick={() => openReplay(s)}
                      shareUrl={`${window.location.origin}${sessionPath(s)}`}
                    />
                  ))}
                </div>
                {shown.length < maxExamples && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() =>
                        setVisibleCount((c) => Math.min(maxExamples, c + STEP))
                      }
                    >
                      {t('Show more')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>,
        <IssueActions
          issue={issue}
          onOpenCritical={() => setCritOpen(true)}
          onNotCritical={() => setNotCritOpen(true)}
          onRename={() => setRenameOpen(true)}
          onHide={() => setHideOpen(true)}
        />,
      )}

      <HideIssueModal
        open={hideOpen}
        head={issue.head}
        reasons={issuesStore.reasons.hide}
        onCancel={() => setHideOpen(false)}
        onConfirm={(reasons, note) => {
          issuesStore.hide(issue.id, reasons, note);
          setHideOpen(false);
        }}
      />
      <RenameIssueModal
        open={renameOpen}
        initial={issue.head}
        onCancel={() => setRenameOpen(false)}
        onConfirm={(name) => {
          issuesStore.rename(issue.id, name);
          setRenameOpen(false);
        }}
      />
      <CriticalDialog
        issueId={critOpen ? issue.id : null}
        issueHead={issue.head}
        onClose={() => setCritOpen(false)}
      />
      <NotCriticalDialog
        issue={notCritOpen ? issue : null}
        reasons={issuesStore.reasons.criticality}
        onClose={() => setNotCritOpen(false)}
      />
    </>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssueDetail)),
);
