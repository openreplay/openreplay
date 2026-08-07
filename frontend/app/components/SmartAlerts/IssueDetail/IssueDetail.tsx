import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { AutoComplete, Button, Input, Tooltip } from 'antd';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import { smartIssueSession, smartIssues, withSiteId } from 'App/saasComponents';

import TagFilter, { SegmentFilter } from '../IssueList/TagFilter';
import { FoundInChips, syncScopeToUrl } from '../segments/SegmentScope';
import {
  CriticalDialog,
  HideIssueModal,
  type IssueSessionCard,
  JOURNEY_SEARCH_SUGGESTIONS,
  JiraIcon,
} from '../shared';
import ProblemCard from './ProblemCard';
import SessionCard from './SessionCard';

const SHOWN_LIMIT = 3;
const MAX_EXAMPLES = 10;

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  // the URL carries the (encoded) issue id; resolve it from cache/list or fetch
  const id = params.issueId ? decodeURIComponent(params.issueId) : '';
  const idParam = params.issueId ?? '';
  const issue = issuesStore.byId(id);

  const [ticketHover, setTicketHover] = React.useState(false);
  const [hideOpen, setHideOpen] = React.useState(false);
  const [critOpen, setCritOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(SHOWN_LIMIT);
  // shared title slot: cards report their natural line counts here; the grid
  // slots every title at the max the visible cards need (capped at 3)
  const [titleLineCounts, setTitleLineCounts] = React.useState<
    Record<string, number>
  >({});
  const reportTitleLines = React.useCallback((id: string, n: number) => {
    setTitleLineCounts((prev) =>
      prev[id] === n ? prev : { ...prev, [id]: n },
    );
  }, []);

  // sessions-only detail filters (segment scope + tag filter), mirrored to ?seg=
  const filterKey = `${issuesStore.detailScope.join(',')}|${
    issuesStore.detailMatch
  }:${issuesStore.detailLabels.join(',')}`;

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);
  React.useEffect(() => {
    if (id) void issuesStore.loadIssue(id);
  }, [id]);
  // seed the detail filters on arrival: a shared ?seg= URL wins, else the list's
  // "Found in" + tag filters propagate in. Cleared on leave so nothing leaks over.
  React.useEffect(() => {
    const seg = new URLSearchParams(window.location.search).get('seg');
    if (seg) {
      issuesStore.setDetailScope(seg.split(',').filter(Boolean));
    } else {
      issuesStore.setDetailScope(
        issuesStore.origins.filter((o): o is string => o !== 'full'),
      );
      syncScopeToUrl(issuesStore.detailScope);
    }
    issuesStore.setDetailMatch(issuesStore.match);
    issuesStore.setDetailLabels(
      issue
        ? issuesStore.labels.filter((tg) => issue.journeyLabels.includes(tg))
        : [],
    );
    return () => {
      issuesStore.clearDetailScope();
      issuesStore.clearDetailLabels();
    };
  }, [issue?.id]);
  React.useEffect(() => {
    if (issue) void issuesStore.loadSessions(issue.id, searchQuery);
  }, [issue?.id, searchQuery, filterKey]);

  // NB: this hook must stay above the early `!issue` return — moving it below
  // makes the hook count differ between renders ("Rendered more hooks…").
  const ql = query.trim().toLowerCase();
  const suggestions = React.useMemo(() => {
    if (!ql) return [];
    return JOURNEY_SEARCH_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(ql),
    ).map((s) => {
      const at = s.toLowerCase().indexOf(ql);
      return {
        value: s,
        label: (
          <span>
            {s.slice(0, at)}
            <b>{s.slice(at, at + ql.length)}</b>
            {s.slice(at + ql.length)}
          </span>
        ),
      };
    });
  }, [ql]);

  const back = () => history.push(withSiteId(smartIssues(), siteId));
  const openReplay = (s: IssueSessionCard) => {
    const q = s.issueTimestamp ? `?jumpto=${s.issueTimestamp}` : '';
    history.push(
      withSiteId(smartIssueSession(idParam, s.sessionId), siteId) + q,
    );
  };

  if (!issue) {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: 1360 }}>
        <div className="rounded-lg border bg-white flex flex-col p-4 gap-4">
          <Button
            type="text"
            size="small"
            icon={<ArrowLeft size={15} />}
            onClick={back}
            className="self-start -ml-2"
          >
            {t('Back to Issues')}
          </Button>
          <div className="p-8 text-center color-gray-medium">
            {issuesStore.loading || issuesStore.isLoadingIssue(id)
              ? t('Loading…')
              : t('Issue not found.')}
          </div>
        </div>
      </div>
    );
  }

  const critState = issuesStore.critState(issue.id);

  // examples are a sample: show a few, "load more" reveals up to MAX_EXAMPLES;
  // the footer reports the full matched-session total from the search
  const sessions = issuesStore.exampleSessions(issue.id, searchQuery);
  const total = issuesStore.sessionsCount(issue.id, searchQuery);
  const loadingSessions = issuesStore.isLoadingSessions(issue.id, searchQuery);
  const maxExamples = Math.min(MAX_EXAMPLES, sessions.length);
  const shown = sessions.slice(0, Math.min(visibleCount, maxExamples));
  const canLoadMore = shown.length < maxExamples;

  // title slot only counts CURRENTLY VISIBLE cards, so it shrinks back when a
  // long-titled card loads out / filters away (capped at 3 lines)
  const titleLines = Math.min(
    3,
    Math.max(1, ...shown.map((s) => titleLineCounts[s.sessionId] ?? 1)),
  );

  const runSearch = (v: string) => {
    setSearchQuery(v);
    setVisibleCount(SHOWN_LIMIT);
  };
  const loadMore = () =>
    setVisibleCount((c) => Math.min(maxExamples, c + SHOWN_LIMIT));

  const search = (
    <AutoComplete
      value={query}
      onChange={setQuery}
      options={suggestions}
      onSelect={runSearch}
      listHeight={160}
      style={{ width: '100%' }}
    >
      <Input.Search
        allowClear
        size="small"
        maxLength={256}
        placeholder={t('Describe the journey to find…')}
        onSearch={runSearch}
      />
    </AutoComplete>
  );

  return (
    <div
      className="mx-auto w-full flex flex-col gap-4"
      style={{ maxWidth: 1360 }}
    >
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={back}
        className="self-start -ml-2"
      >
        {t('Back to Issues')}
      </Button>

      <div className="rounded-lg border bg-white">
        <ProblemCard
          framed
          issue={{ ...issue, critical: critState !== 'none' }}
          editable
          onRename={(newName) => issuesStore.rename(issue.id, newName)}
          onOpenCritical={() => setCritOpen(true)}
          criticalMine={critState === 'mine'}
          criticalBy={
            issuesStore.matchedRules(issue.id).find((r) => !r.mine)?.createdBy
          }
          actions={
            <>
              <Button
                type="primary"
                size="small"
                icon={
                  ticketHover ? (
                    <ExternalLink size={14} />
                  ) : (
                    <JiraIcon size={14} />
                  )
                }
                onMouseEnter={() => setTicketHover(true)}
                onMouseLeave={() => setTicketHover(false)}
              >
                {t('Create ticket')}
              </Button>
              {/* follows the ISSUE's own flag, not the list's visibility
                  filter — this page is deep-linkable and `all` mixes both */}
              {issue.hidden ? (
                <Button
                  size="small"
                  icon={<Eye size={14} />}
                  onClick={() => issuesStore.unhide(issue.id)}
                >
                  {t('Unhide')}
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<EyeOff size={14} />}
                  onClick={() => setHideOpen(true)}
                >
                  {t('Hide')}
                </Button>
              )}
            </>
          }
        />
        {(issue.segmentIds.length > 0 || issuesStore.segments.length > 0) && (
          <div className="px-4 pb-4 -mt-1">
            <FoundInChips issue={issue} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {/* toolbar shares the cards' 3-column grid so the search aligns flush with the cards below */}
        <div className="grid items-center gap-x-4 gap-y-2 md:grid-cols-3">
          <div className="flex items-center justify-between gap-3 flex-wrap md:col-span-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold color-gray-darkest">
                {t('Example sessions')}
              </span>
              <Tooltip
                title={t(
                  'A sample of the sessions where the agent detected this issue, not the full set. Search or load more to see other examples.',
                )}
              >
                <Info size={15} className="color-gray-medium" />
              </Tooltip>
            </div>
            {/* sessions-only filters — headline stats stay global */}
            <div className="flex items-center gap-2">
              <TagFilter
                allTags={issuesStore.allTags}
                labels={issuesStore.detailLabels}
                match={issuesStore.detailMatch}
                onToggle={issuesStore.toggleDetailLabel}
                onSetMatch={issuesStore.setDetailMatch}
                onClear={issuesStore.clearDetailLabels}
                onCreateTag={issuesStore.addCustomTag}
              />
              {issuesStore.originSegments.length > 0 && (
                <SegmentFilter
                  segments={issuesStore.originSegments.map((s) => ({
                    id: s.id,
                    name: s.name,
                    mine: s.mine,
                  }))}
                  origins={issuesStore.detailScope}
                  onToggleOrigin={(o) => {
                    if (o === 'full') return; // no full-traffic row here
                    issuesStore.toggleDetailScope(o);
                    syncScopeToUrl(issuesStore.detailScope);
                  }}
                  onSetOrigins={(ids) => {
                    issuesStore.setDetailScope(
                      ids.filter((o): o is string => o !== 'full'),
                    );
                    syncScopeToUrl(issuesStore.detailScope);
                  }}
                  onClear={() => {
                    issuesStore.clearDetailScope();
                    syncScopeToUrl([]);
                  }}
                  showFullTraffic={false}
                />
              )}
            </div>
          </div>
          {search}
        </div>

        {loadingSessions ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-lg border bg-white">
            <Loader
              size={22}
              className="animate-spin"
              style={{ color: 'var(--color-teal)' }}
            />
            <span className="text-sm font-medium color-gray-dark">
              {t('Searching journeys…')}
            </span>
            <span className="text-xs color-gray-medium">
              {t('This might take a bit.')}
            </span>
          </div>
        ) : shown.length === 0 ? (
          <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium flex flex-col items-center gap-2">
            {issuesStore.detailScope.length > 0 ||
            issuesStore.detailLabels.length > 0 ? (
              <>
                <span>
                  {t('No sampled sessions match the selected filters.')}
                </span>
                <Button
                  size="small"
                  onClick={() => {
                    issuesStore.clearDetailScope();
                    issuesStore.clearDetailLabels();
                    syncScopeToUrl([]);
                  }}
                >
                  {t('Clear filters')}
                </Button>
              </>
            ) : searchQuery ? (
              t('No sessions match this search.')
            ) : (
              t('No example sessions.')
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {shown.map((s) => (
                <SessionCard
                  key={s.sessionId}
                  s={s}
                  onClick={() => openReplay(s)}
                  titleLines={titleLines}
                  onTitleLines={reportTitleLines}
                />
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 shadow-xs w-full bg-white rounded-lg">
              <span className="text-sm color-gray-dark">
                {t('Showing')}{' '}
                <span className="font-medium">{shown.length}</span>{' '}
                {shown.length === 1 ? t('example') : t('examples')} {t('of')}{' '}
                <span className="font-medium">{total.toLocaleString()}</span>{' '}
                {t('sessions')}
                {issuesStore.detailScope.length > 0 && (
                  <>
                    {' · '}
                    {t('shown for {{names}}', {
                      names: issuesStore.detailScope
                        .map((id) => issuesStore.segmentById(id)?.name)
                        .filter(Boolean)
                        .join(', '),
                    })}
                  </>
                )}
                {issuesStore.detailLabels.length > 0 && (
                  <>
                    {' · '}
                    {t('tagged {{tags}}', {
                      tags: issuesStore.detailLabels.join(
                        issuesStore.detailMatch === 'any' ? ' or ' : ' and ',
                      ),
                    })}
                  </>
                )}
              </span>
              {canLoadMore && (
                <Button size="small" onClick={loadMore}>
                  {t('Load more')}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

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

      <CriticalDialog
        issueId={critOpen ? issue.id : null}
        issueHead={issue.head}
        onClose={() => setCritOpen(false)}
      />
    </div>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssueDetail)),
);
