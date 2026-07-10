import withPageTitle from 'HOCs/withPageTitle';
import { Button, Tag, Tooltip, message } from 'antd';
import { ArrowLeft, ExternalLink, FileText, Presentation, Split } from 'lucide-react';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useHistory, useParams } from 'App/routing';
import { useStore } from 'App/mstore';
import { withSiteId, audits as auditsRoute, issue as issueRoute } from 'App/routes';
import { MOCK_THUMB } from 'Components/Issues/mockThumb';
import { RowTagChip } from 'Components/Issues/IssuesList';

import { auditsStore, useAuditsStore } from './auditsStore';
import { REPORT, ReportFinding } from './reportContent';

/* The artifact viewer — in-app rendering of the SAME static 16:9 slides the
   PDF/PPT exports contain (Mehdi 07-01: static, consulting-firm style, one
   consistent shell the model fills every time). Deck conventions:
   · every slide carries an ACTION TITLE — the takeaway as a sentence, not a
     section label (the consulting habit that makes a deck skimmable);
   · severity is written in words (Critical / Major / Minor) — codes like
     "P0" never reach the reader; the scale is defined where it is used;
   · print-first: every value is direct-labeled, nothing lives behind hover. */

const SEV_LABEL: Record<string, string> = {
  P0: 'Critical',
  P1: 'Major',
  P2: 'Minor',
};
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

function Slide({
  page,
  label,
  headline,
  children,
}: {
  page: number;
  label: string;
  /** the action title — the slide's takeaway as a sentence */
  headline?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-lg border flex flex-col overflow-hidden"
      style={{ aspectRatio: '16 / 9', borderTop: '3px solid var(--color-main)' }}
    >
      <div className="flex flex-col flex-1 min-h-0 px-12 py-8">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-gray-medium)', letterSpacing: '0.08em' }}
        >
          {label}
        </div>
        {headline && (
          <div
            className="text-2xl font-semibold mt-1.5"
            style={{ color: 'var(--color-gray-darkest)' }}
          >
            {headline}
          </div>
        )}
        <div className="flex flex-col flex-1 min-h-0 mt-4">{children}</div>
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
      {SEV_LABEL[severity] ?? severity}
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
    <Slide page={page} label={`Finding ${index}`} headline={finding.title}>
      {/* meta row wears the same chips as an Issues row — origin chip (the
          scope segment) + tag chips: the two agents share one visual language */}
      <div className="text-sm -mt-2 flex items-center gap-2 flex-wrap" style={{ color: 'var(--color-gray-medium)' }}>
        <SevTag severity={finding.severity} />
        <span>
          {finding.where} · {finding.sessions.toLocaleString()} sessions ·{' '}
          {finding.pctOfSample}% of the sample
        </span>
        <Tooltip title={`Found in segment: ${REPORT.scope[0].replace('Segment: ', '')}`} placement="top">
          <span
            className="rounded-md border flex items-center justify-center shrink-0 cursor-default"
            style={{
              width: 22,
              height: 22,
              borderColor: 'var(--color-gray-light)',
              background: 'var(--color-gray-lightest)',
              color: 'var(--color-main)',
            }}
          >
            <Split size={13} />
          </span>
        </Tooltip>
        {finding.tags.map((t) => (
          <RowTagChip key={t} label={t} />
        ))}
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

/* The journey exhibit — horizontal funnel, remainder as a recessive track,
   every value direct-labeled (print-first: nothing lives behind hover). */
function FunnelSlide({ page }: { page: number }) {
  const { steps, highlightStep, highlightNote } = REPORT.funnel;
  const max = steps[0].sessions;
  return (
    <Slide
      page={page}
      label="Journey"
      headline="Payment loses 30% of its sessions; two thirds of that drop is avoidable"
    >
      <div className="flex gap-10 flex-1 mt-2">
        {/* left: the exhibit */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {steps.map((step, i) => {
            const pct = (step.sessions / max) * 100;
            const prev = i > 0 ? steps[i - 1].sessions : null;
            const drop = prev != null ? prev - step.sessions : 0;
            const dropPct = prev ? Math.round((drop / prev) * 100) : 0;
            const highlighted = i === highlightStep;
            return (
              <React.Fragment key={step.label}>
                {i > 0 && (
                  <div
                    className="text-xs py-0.5"
                    style={{
                      paddingLeft: 140,
                      color: highlighted ? 'var(--color-red)' : 'var(--color-gray-medium)',
                      fontWeight: highlighted ? 600 : 400,
                    }}
                  >
                    ↓ −{drop.toLocaleString()} sessions ({dropPct}%)
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <span
                    className="text-sm font-medium w-28 shrink-0 text-right"
                    style={{ color: 'var(--color-gray-darkest)' }}
                  >
                    {step.label}
                  </span>
                  <div
                    className="h-7 rounded flex-1 overflow-hidden"
                    style={{ background: 'var(--color-gray-lightest)' }}
                  >
                    <div
                      className="h-full rounded-r flex items-center justify-end pr-2"
                      style={{ width: `${pct}%`, background: 'var(--color-main)' }}
                    >
                      <span className="text-xs font-semibold tabular-nums text-white">
                        {step.sessions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div className="text-xs mt-3" style={{ paddingLeft: 140, color: 'var(--color-gray-medium)' }}>
            Sampled sessions reaching each step; the gray track is the sample
            baseline (2,000 sessions).
          </div>
        </div>

        {/* right: what the exhibit means */}
        <div className="flex flex-col gap-4 shrink-0" style={{ width: '34%' }}>
          <p className="text-base leading-relaxed m-0" style={{ color: 'var(--color-gray-darkest)' }}>
            {REPORT.funnel.description}
          </p>
          <div className="text-sm font-medium" style={{ color: 'var(--color-red)' }}>
            {highlightNote}
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
      <Slide
        page={2}
        label="Executive summary"
        headline={`Checkout scores ${health} of 100. Two payment findings account for most of the gap.`}
      >
        <div className="flex gap-10 flex-1 items-start mt-1">
          <div className="shrink-0 flex flex-col items-start">
            <span
              className="font-semibold tabular-nums leading-none"
              style={{ fontSize: 84, color: scoreColor(health) }}
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
            <div className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
              Severity scale: Critical blocks task completion · Major causes
              significant friction · Minor is recoverable with effort.
            </div>
          </div>
        </div>
      </Slide>

      {/* ---- slide 3: scorecard ---- */}
      <Slide
        page={3}
        label="Scorecard"
        headline="Feedback and error recovery drag the score; structure and clarity are healthy"
      >
        <div className="text-sm -mt-1" style={{ color: 'var(--color-gray-dark)' }}>
          Each dimension is scored 0–100 from the sampled sessions.
        </div>
        <div className="flex flex-col gap-7 mt-8">
          {REPORT.dimensions.map((d) => (
            <div key={d.name} className="flex items-center gap-5">
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
                className="text-sm shrink-0"
                style={{ color: 'var(--color-gray-dark)', width: '34%' }}
              >
                {d.note}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 mt-auto text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          {(
            [
              ['75 and above: healthy', 'var(--color-teal)'],
              ['50–74: needs attention', 'var(--color-orange)'],
              ['Below 50: at risk', 'var(--color-red)'],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </Slide>

      {/* ---- slide 4: the journey exhibit ---- */}
      <FunnelSlide page={4} />

      {/* ---- slides 5–6: finding spreads ---- */}
      {REPORT.findings.map((f, i) => (
        <FindingSlide key={f.id} page={5 + i} index={i + 1} finding={f} siteId={siteId} />
      ))}

      {/* ---- slide 7: what's working + roadmap ---- */}
      <Slide
        page={7}
        label="What's working · Roadmap"
        headline="Fix payment first; protect what already orients users"
      >
        <div className="flex gap-10 flex-1 mt-1">
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
            <div
              className="rounded-lg px-4 py-3 text-sm mt-1"
              style={{ background: 'var(--color-gray-lightest)', color: 'var(--color-gray-darkest)' }}
            >
              <span className="font-semibold">The size of the prize: </span>
              {REPORT.sizing}
            </div>
          </div>
        </div>
      </Slide>

      {/* ---- slide 8: method appendix ---- */}
      <Slide page={8} label="Method">
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
