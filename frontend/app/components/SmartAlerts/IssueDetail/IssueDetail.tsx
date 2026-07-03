import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { AutoComplete, Button, Input, Tooltip, Typography } from 'antd';
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

import {
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
  // the URL carries the (encoded) issue name; resolve it from cache/list or fetch
  const name = params.issueId ? decodeURIComponent(params.issueId) : '';
  const idParam = params.issueId ?? '';
  const issue = issuesStore.byId(name);

  const [ticketHover, setTicketHover] = React.useState(false);
  const [hideOpen, setHideOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(SHOWN_LIMIT);

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);
  React.useEffect(() => {
    if (name) void issuesStore.loadIssue(name);
  }, [name]);
  React.useEffect(() => {
    if (issue) void issuesStore.loadSessions(issue.id, searchQuery);
  }, [issue?.id, searchQuery]);

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
            {issuesStore.loading || issuesStore.isLoadingIssue(name)
              ? t('Loading…')
              : t('Issue not found.')}
          </div>
        </div>
      </div>
    );
  }

  // examples are a sample: show a few, "load more" reveals up to MAX_EXAMPLES;
  // the footer reports the full matched-session total from the search
  const sessions = issuesStore.exampleSessions(issue.id, searchQuery);
  const total = issuesStore.sessionsCount(issue.id, searchQuery);
  const loadingSessions = issuesStore.isLoadingSessions(issue.id, searchQuery);
  const maxExamples = Math.min(MAX_EXAMPLES, sessions.length);
  const shown = sessions.slice(0, Math.min(visibleCount, maxExamples));
  const canLoadMore = shown.length < maxExamples;

  const runSearch = (v: string) => {
    setSearchQuery(v);
    setVisibleCount(SHOWN_LIMIT);
  };
  const loadMore = () =>
    setVisibleCount((c) => Math.min(maxExamples, c + SHOWN_LIMIT));

  // canned journey phrases filtered by the typed text, matching part bolded
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

  const search = (
    <AutoComplete
      value={query}
      onChange={setQuery}
      options={suggestions}
      onSelect={runSearch}
      listHeight={160}
      style={{ width: 360 }}
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
          issue={issue}
          editable
          onRename={(newName) => issuesStore.rename(issue.id, newName)}
          onSetCritical={(val, reasons, note) =>
            issuesStore.setCritical(issue.id, val, reasons, note)
          }
          criticalReasons={issuesStore.reasons.criticality}
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
              {issuesStore.viewingHidden ? (
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
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
          <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium">
            {searchQuery
              ? t('No sessions match this search.')
              : t('No example sessions.')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {shown.map((s) => (
                <SessionCard
                  key={s.sessionId}
                  s={s}
                  onClick={() => openReplay(s)}
                />
              ))}
            </div>
            {/* footer: quiet sample total left, Load more truly centered */}
            <div className="grid grid-cols-3 items-center min-h-8">
              <Typography.Text type="secondary" className="text-sm">
                {t('Sample of {{total}} matching sessions', { total })}
              </Typography.Text>
              <div className="flex justify-center">
                {canLoadMore && (
                  <Button onClick={loadMore}>{t('Load more examples')}</Button>
                )}
              </div>
              <span />
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
    </div>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssueDetail)),
);
