import withPageTitle from 'HOCs/withPageTitle';
import { Button, Tag, message } from 'antd';
import { ArrowLeft, ExternalLink, FileText, Presentation } from 'lucide-react';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useHistory, useParams } from 'App/routing';
import { useStore } from 'App/mstore';
import { withSiteId, audits as auditsRoute, issue as issueRoute } from 'App/routes';
import { MOCK_THUMB } from 'Components/Issues/mockThumb';

import { auditsStore, useAuditsStore } from './auditsStore';
import { REPORT, ReportFinding } from './reportContent';

/* The artifact viewer — in-app rendering of the SAME static 16:9 slides the
   PDF/PPT exports contain (Mehdi 07-01: static, consulting-firm style, one
   consistent shell the model fills every time). This page doubles as the
   template spec: cover → executive summary → scorecard → one spread per
   finding (evidence + reach + recommendation + links back into the product)
   → what's working + roadmap → method appendix. */

const SEV_COLOR: Record<string, string> = {
  P0: 'var(--color-red)',
  P1: 'var(--color-orange)',
  P2: 'var(--color-gray-medium)',
};

const scoreColor = (score: number) =>
  score >= 75
    ? 'var(--color-teal)'
    : score >= 50
      ? 'var(--color-orange)'
      : 'var(--color-red)';

const kicker = (label: string) => (
  <div
    className="text-[11px] font-semibold uppercase tracking-wider"
    style={{ color: 'var(--color-gray-medium)', letterSpacing: '0.08em' }}
  >
    {label}
  </div>
);

function Slide({
  page,
  label,
  children,
}: {
  page: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-lg border flex flex-col overflow-hidden"
      style={{ aspectRatio: '16 / 9', borderTop: '3px solid var(--color-main)' }}
    >
      <div className="flex flex-col flex-1 min-h-0 px-12 py-9">
        {kicker(label)}
        <div className="flex flex-col flex-1 min-h-0 mt-3">{children}</div>
      </div>
      <div
        className="flex items-center justify-between px-12 py-3 text-xs border-t"
        style={{ color: 'var(--color-gray-medium)', borderColor: 'var(--color-gray-lightest)' }}
      >
        <span>
          OpenReplay · UX Agent · {REPORT.title}, {REPORT.subtitle.split('· ')[1]}
        </span>
        <span className="tabular-nums">{page}</span>
      </div>
    </div>
  );
}

function SevTag({ severity }: { severity: string }) {
  return (
    <Tag
      style={{
        borderRadius: 4,
        color: SEV_COLOR[severity],
        borderColor: SEV_COLOR[severity],
        background: 'transparent',
        fontWeight: 600,
      }}
    >
      {severity}
    </Tag>
  );
}

function FindingSlide({
  page,
  index,
  finding,
  siteId,
}: {
  page: number;
  index: number;
  finding: ReportFinding;
  siteId: string | null;
}) {
  const history = useHistory();
  return (
    <Slide page={page} label={`Finding ${index}`}>
      <div className="flex items-center gap-2">
        <SevTag severity={finding.severity} />
        <span className="text-2xl font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
          {finding.title}
        </span>
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--color-gray-medium)' }}>
        {finding.where} · {finding.sessions.toLocaleString()} sessions ·{' '}
        {finding.pctOfSample}% of the sample
      </div>

      <div className="flex gap-8 mt-5 flex-1 min-h-0">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div
            className="text-base leading-relaxed pl-4"
            style={{
              color: 'var(--color-gray-darkest)',
              borderLeft: '3px solid var(--color-gray-light)',
            }}
          >
            {finding.evidence}
          </div>
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--color-gray-lightest)', color: 'var(--color-gray-darkest)' }}
          >
            <span className="font-semibold">Recommendation: </span>
            {finding.recommendation}
          </div>
          <div className="flex items-center gap-4 text-sm mt-auto">
            {finding.relatedIssueId != null && (
              <Button
                type="link"
                size="small"
                className="px-0!"
                icon={<ExternalLink size={13} />}
                onClick={() =>
                  history.push(
                    withSiteId(issueRoute(String(finding.relatedIssueId)), siteId),
                  )
                }
              >
                View example sessions · Issue: {finding.relatedIssueName}
              </Button>
            )}
          </div>
        </div>
        <div className="shrink-0 self-start" style={{ width: '38%' }}>
          <img
            src={MOCK_THUMB}
            alt={`${finding.where} — screenshot`}
            className="w-full rounded-lg border"
          />
          <div className="text-xs mt-1.5" style={{ color: 'var(--color-gray-medium)' }}>
            {finding.where}, from an affected session
          </div>
        </div>
      </div>
    </Slide>
  );
}

function AuditReport() {
  const { auditId } = useParams<{ auditId: string }>();
  const { audits } = useAuditsStore();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const history = useHistory();
  const audit =
    audits.find((a) => String(a.id) === auditId) ?? auditsStore.byId(2);

  const back = () => history.push(withSiteId(auditsRoute(), siteId));
  const download = (kind: 'PDF' | 'slides') =>
    message.success(`Export started. The ${kind} will be emailed to you.`);

  const health = audit?.healthScore ?? REPORT.healthScore;

  return (
    <div className="mx-auto w-full flex flex-col gap-4" style={{ maxWidth: 1100 }}>
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={back}
        className="self-start -ml-2"
      >
        Back to Audits
      </Button>

      {/* viewer header — the artifact's identity + exports */}
      <div className="rounded-lg border bg-white flex items-center justify-between px-4 py-2">
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{audit?.name ?? REPORT.title}</span>
          <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
            {(audit?.scope ?? REPORT.scope).join(' · ')} · sample of{' '}
            {(audit?.sampleSize ?? REPORT.sampleSize).toLocaleString()} sessions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" icon={<FileText size={14} />} onClick={() => download('PDF')}>
            PDF
          </Button>
          <Button size="small" icon={<Presentation size={14} />} onClick={() => download('slides')}>
            Slides
          </Button>
        </div>
      </div>

      {/* ---- slide 1: cover ---- */}
      <Slide page={1} label="UX audit">
        <div className="flex flex-col justify-center flex-1">
          <div className="text-5xl font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
            {REPORT.title}
          </div>
          <div className="text-xl mt-2" style={{ color: 'var(--color-gray-dark)' }}>
            {REPORT.subtitle}
          </div>
          <div className="flex items-center gap-2 mt-6">
            {REPORT.scope.map((s) => (
              <Tag key={s} style={{ borderRadius: 4 }}>
                {s}
              </Tag>
            ))}
          </div>
          <div className="text-sm mt-6" style={{ color: 'var(--color-gray-medium)' }}>
            {REPORT.sampleSize.toLocaleString()} sessions read from{' '}
            {REPORT.matched.toLocaleString()} matching · generated {REPORT.generatedAt} · by
            the OpenReplay UX Agent
          </div>
        </div>
      </Slide>

      {/* ---- slide 2: executive summary ---- */}
      <Slide page={2} label="Executive summary">
        <div className="flex gap-10 flex-1 items-start mt-2">
          <div className="shrink-0 flex flex-col items-start">
            <span
              className="font-semibold tabular-nums leading-none"
              style={{ fontSize: 88, color: scoreColor(health) }}
            >
              {health}
            </span>
            <span className="text-sm mt-2" style={{ color: 'var(--color-gray-medium)' }}>
              UX health, out of 100
            </span>
          </div>
          <div className="flex flex-col gap-5 min-w-0">
            <p className="text-base leading-relaxed m-0" style={{ color: 'var(--color-gray-darkest)' }}>
              {REPORT.verdict}
            </p>
            <div className="flex flex-col gap-2">
              {REPORT.topFindings.map((f) => (
                <div key={f.title} className="flex items-center gap-2 text-sm">
                  <SevTag severity={f.severity} />
                  <span style={{ color: 'var(--color-gray-darkest)' }}>{f.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ---- slide 3: scorecard ---- */}
      <Slide page={3} label="Scorecard">
        <div className="flex flex-col justify-center gap-4 flex-1">
          {REPORT.dimensions.map((d) => (
            <div key={d.name} className="flex items-center gap-4">
              <span className="text-sm font-medium w-40 shrink-0" style={{ color: 'var(--color-gray-darkest)' }}>
                {d.name}
              </span>
              <div
                className="h-2 rounded-full flex-1 overflow-hidden"
                style={{ background: 'var(--color-gray-lightest)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${d.score}%`, background: scoreColor(d.score) }}
                />
              </div>
              <span
                className="text-sm font-semibold tabular-nums w-8 text-right shrink-0"
                style={{ color: scoreColor(d.score) }}
              >
                {d.score}
              </span>
              <span
                className="text-xs w-72 shrink-0 truncate"
                style={{ color: 'var(--color-gray-medium)' }}
                title={d.note}
              >
                {d.note}
              </span>
            </div>
          ))}
        </div>
      </Slide>

      {/* ---- slides 4–5: finding spreads ---- */}
      {REPORT.findings.map((f, i) => (
        <FindingSlide key={f.id} page={4 + i} index={i + 1} finding={f} siteId={siteId} />
      ))}

      {/* ---- slide 6: what's working + roadmap ---- */}
      <Slide page={6} label="What's working · Roadmap">
        <div className="flex gap-10 flex-1 mt-2">
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
              Protect these
            </span>
            {REPORT.positives.map((p) => (
              <div key={p.title} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: 'var(--color-teal)' }}>
                  {p.title}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-gray-dark)' }}>
                  {p.note}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
              Fix in this order
            </span>
            {REPORT.roadmap.map((r) => (
              <div key={r.item} className="flex items-center gap-3 text-sm">
                <SevTag severity={r.severity} />
                <span className="flex-1 min-w-0" style={{ color: 'var(--color-gray-darkest)' }}>
                  {r.item}
                </span>
                <span
                  className="shrink-0 text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-gray-lightest)', color: 'var(--color-gray-medium)' }}
                >
                  effort {r.effort}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* ---- slide 7: method appendix ---- */}
      <Slide page={7} label="Method">
        <div className="grid grid-cols-2 gap-x-10 gap-y-6 flex-1 content-center">
          {(
            [
              ['Sample', REPORT.method.sample],
              ['How the agent reads sessions', REPORT.method.how],
              ['Scoring', REPORT.method.scoring],
              ['Not assessed', REPORT.method.limits],
            ] as const
          ).map(([title, body]) => (
            <div key={title} className="flex flex-col gap-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
                {title}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--color-gray-dark)' }}>
                {body}
              </span>
            </div>
          ))}
          <div className="col-span-2 text-xs" style={{ color: 'var(--color-gray-medium)' }}>
            Dimension → heuristic mapping:{' '}
            {REPORT.dimensions.map((d) => `${d.name} — ${d.heuristics}`).join(' · ')}
          </div>
        </div>
      </Slide>
    </div>
  );
}

export default withPageTitle('Audit report - OpenReplay')(observer(AuditReport));
