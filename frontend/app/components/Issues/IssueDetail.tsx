import React from 'react';
import { Button, Tag, Tooltip } from 'antd';
import { ArrowLeft, Ticket, Pencil, EyeOff, Play, TriangleAlert } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import { withSiteId, issues as issuesRoute } from 'App/routes';
import { CAT_COLOR, impactLevel, lastSeenLabel } from 'App/mstore/issuesStore';

/* Intermediary issue page — intentionally LOW FIDELITY for now. This is the
   wireframe we discussed in the meeting: a problem card that stands out, a small
   deck of example sessions (backend will pick 3–5), and an embedded replay, with
   "Create ticket" as the primary action. Layout/flow only; not pixel-final. */

const dashed: React.CSSProperties = {
  border: '1.5px dashed var(--color-gray-light)',
  borderRadius: 8,
  background: 'var(--color-gray-lightest)',
  color: 'var(--color-gray-medium)',
};

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  const issue = issuesStore.byId(Number(params.issueId));

  const back = () => history.push(withSiteId(issuesRoute(), siteId));

  if (!issue) {
    return (
      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1100 }}>
        <Button type="text" icon={<ArrowLeft size={15} />} onClick={back}>
          Back to Issues
        </Button>
        <div className="p-8 text-center" style={dashed}>Issue not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1100 }}>
      {/* wireframe banner */}
      <div
        className="flex items-center justify-between rounded-md px-3 py-1.5 text-xs"
        style={{ background: 'var(--color-amber-50, #fff7ed)', color: 'var(--color-orange)', border: '1px solid var(--color-orange)' }}
      >
        <span>Wireframe — detail &amp; replay layout in progress, not final.</span>
      </div>

      {/* top bar */}
      <div className="flex items-center justify-between">
        <Button type="text" icon={<ArrowLeft size={15} />} onClick={back}>
          Back to Issues
        </Button>
        <div className="flex items-center gap-2">
          <Button type="primary" icon={<Ticket size={15} />}>Create ticket</Button>
          <Button icon={<Pencil size={14} />}>Rename</Button>
          <Button icon={<EyeOff size={14} />}>Hide</Button>
        </div>
      </div>

      {/* problem card — the one that should stand out */}
      <div
        className="rounded-lg p-5 flex flex-col gap-3"
        style={{ background: 'var(--color-gray-lightest)', border: '1px solid var(--color-gray-light)' }}
      >
        <div className="flex items-center gap-2">
          {issue.critical && <TriangleAlert size={16} style={{ color: 'var(--color-red)' }} />}
          <span className="text-xl font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
            {issue.head}
          </span>
          <Tag
            style={{
              color: CAT_COLOR[issue.cat],
              background: `color-mix(in srgb, ${CAT_COLOR[issue.cat]} 12%, white)`,
              border: `1px solid color-mix(in srgb, ${CAT_COLOR[issue.cat]} 26%, white)`,
              borderRadius: 6,
            }}
          >
            {issue.cat}
          </Tag>
          <span className="ml-auto text-xs" style={{ color: 'var(--color-gray-medium)' }}>
            {impactLevel(issue.impact)} impact · last seen {lastSeenLabel(issue.seenAgoMin)}
          </span>
        </div>
        <p style={{ color: 'var(--color-gray-dark)', margin: 0, lineHeight: 1.5 }}>{issue.real}</p>
        <p style={{ color: 'var(--color-gray-medium)', margin: 0, lineHeight: 1.5 }}>{issue.journey}</p>
      </div>

      {/* embedded replay placeholder */}
      <div className="flex items-center justify-center gap-2" style={{ ...dashed, height: 320 }}>
        <Play size={18} /> <span>Embedded session replay</span>
      </div>

      {/* example sessions deck (backend will pick 3–5) */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--color-gray-dark)' }}>
          Example sessions
        </span>
        <div className="flex gap-3 flex-wrap">
          {issue.sessions.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 p-3" style={{ ...dashed, width: 220 }}>
              <div className="rounded" style={{ height: 96, background: 'var(--color-gray-light)' }} />
              <span className="text-xs truncate" style={{ color: 'var(--color-gray-dark)' }}>{s.email}</span>
              <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
                {s.browser} · {s.loc} · {s.dur}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default observer(IssueDetail);
