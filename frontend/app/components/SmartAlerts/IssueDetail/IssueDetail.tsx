import withPageTitle from '@/components/hocs/withPageTitle';
import { Button, Input } from 'antd';
import { ArrowLeft, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import { smartIssueSession, smartIssues, withSiteId } from 'App/saasComponents';
import { debounce } from 'App/utils';

import { HideIssueModal, type IssueSessionCard, JiraIcon } from '../shared';
import ProblemCard from './ProblemCard';
import SessionCard from './SessionCard';

const SHOWN_LIMIT = 3;

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  const slug = params.issueId ?? '';
  const issue = issuesStore.bySlug(slug);

  const [ticketHover, setTicketHover] = React.useState(false);
  const [hideOpen, setHideOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  // debounce keystrokes before hitting the search endpoint
  const debouncedSearch = React.useMemo(
    () => debounce(setSearchQuery, 300),
    [],
  );

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);
  React.useEffect(() => {
    debouncedSearch(query);
  }, [query]);
  React.useEffect(() => {
    if (issue) void issuesStore.loadSessions(issue.id, searchQuery);
  }, [issue?.id, searchQuery]);

  const back = () => history.push(withSiteId(smartIssues(), siteId));
  const openReplay = (s: IssueSessionCard) => {
    const q = s.issueTimestamp ? `?jumpto=${s.issueTimestamp}` : '';
    history.push(withSiteId(smartIssueSession(slug, s.sessionId), siteId) + q);
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
            {issuesStore.loading ? t('Loading…') : t('Issue not found.')}
          </div>
        </div>
      </div>
    );
  }

  // only a few example sessions are shown to keep the focus tight, but the
  // search reports the full match count (out of X)
  const sessions = issuesStore.exampleSessions(issue.id, searchQuery);
  const shown = sessions.slice(0, SHOWN_LIMIT);
  const total = issuesStore.sessionsCount(issue.id, searchQuery);
  const loadingSessions = issuesStore.isLoadingSessions(issue.id, searchQuery);

  const search = (
    <Input.Search
      allowClear
      size="small"
      className="w-[280px]"
      placeholder={t('Search sessions by journey or issue')}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onSearch={(v) => setSearchQuery(v)}
    />
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
          onRename={(name) => issuesStore.rename(issue.id, name)}
          onSetCritical={(val, reason) =>
            issuesStore.setCritical(issue.id, val, reason)
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
              {issuesStore.hidden.includes(issue.id) ? (
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

      <div className="flex items-center justify-end">{search}</div>

      {loadingSessions ? (
        <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium">
          {t('Loading sessions…')}
        </div>
      ) : shown.length === 0 ? (
        <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium">
          {searchQuery
            ? t('No sessions match this search.')
            : t('No example sessions.')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {shown.map((s) => (
              <SessionCard
                key={s.sessionId}
                s={s}
                onClick={() => openReplay(s)}
              />
            ))}
          </div>
          <div className="text-disabled-text text-sm">
            {t('Showing {{shown}} example sessions out of {{total}}', {
              shown: shown.length,
              total,
            })}
          </div>
        </div>
      )}

      <HideIssueModal
        open={hideOpen}
        head={issue.head}
        onCancel={() => setHideOpen(false)}
        onConfirm={(note, tags) => {
          issuesStore.hide(issue.id, note, tags);
          setHideOpen(false);
        }}
      />
    </div>
  );
}

export default withPageTitle('Smart Issues')(observer(IssueDetail));
