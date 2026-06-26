import { Button } from 'antd';
import { ArrowLeft, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import { smartIssueSession, smartIssues, withSiteId } from 'App/saasComponents';

import { HideIssueModal, type IssueSessionCard } from '../shared';
import ProblemCard from './ProblemCard';
import SessionCard from './SessionCard';

/* Jira mark (line style) — creating a ticket targets Jira, so the action
   carries the Jira icon. Inherits the button text color via currentColor. */
function JiraIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5,22.9722h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556A8.7361,8.7361,0,0,0,25.0278,42.5h0V22.9722Z" />
      <path d="M14.2361,14.2361h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556a8.7361,8.7361,0,0,0,8.7361,8.7361h0V14.2361Z" />
      <path d="M22.9722,5.5h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556A8.7361,8.7361,0,0,0,42.5,25.0278h0V5.5Z" />
    </svg>
  );
}

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  const slug = params.issueId ?? '';
  const issue = issuesStore.bySlug(slug);

  const [ticketHover, setTicketHover] = React.useState(false);
  const [hideOpen, setHideOpen] = React.useState(false);

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);
  React.useEffect(() => {
    if (issue) void issuesStore.loadSessions(issue.id);
  }, [issue?.id]);

  const back = () => history.push(withSiteId(smartIssues(), siteId));
  const openReplay = (s: IssueSessionCard) => {
    const q = s.issueTimestamp ? `?jumpto=${s.issueTimestamp}` : '';
    history.push(
      withSiteId(smartIssueSession(slug, s.sessionId), siteId) + q,
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
            Back to Issues
          </Button>
          <div className="p-8 text-center color-gray-medium">
            {issuesStore.loading ? 'Loading…' : 'Issue not found.'}
          </div>
        </div>
      </div>
    );
  }

  const sessions = issuesStore.exampleSessions(issue.id);

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
        Back to Issues
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
                Create ticket
              </Button>
              {issuesStore.hidden.includes(issue.id) ? (
                <Button
                  size="small"
                  icon={<Eye size={14} />}
                  onClick={() => issuesStore.unhide(issue.id)}
                >
                  Unhide
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<EyeOff size={14} />}
                  onClick={() => setHideOpen(true)}
                >
                  Hide
                </Button>
              )}
            </>
          }
        />
      </div>

      {issuesStore.sessionsLoading[issue.id] ? (
        <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium">
          Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-6 text-center rounded-lg border bg-white text-sm color-gray-medium">
          No example sessions.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.sessionId}
              s={s}
              onClick={() => openReplay(s)}
            />
          ))}
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

export default observer(IssueDetail);
