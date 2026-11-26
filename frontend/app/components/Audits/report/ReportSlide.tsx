import { BrowserIcon } from '@/ui/brand/BrowserIcon';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { Chip } from '@/ui/data/Chip';
import { ImpactMeter } from '@/ui/data/ImpactMeter';
import { SessionAvatar } from '@/ui/data/SessionAvatar';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Monitor,
  MonitorSmartphone,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import React, {
  Fragment,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { SectionIcon } from '../SectionIcon';
import { CHAPTERS } from '../model';
import {
  IntensityChart,
  KIND_COLOR,
  KIND_LABEL,
  RetentionChart,
  ScatterChart,
  Spark,
} from './ReportCharts';
import {
  type DeckMeta,
  type Fact,
  type Kpi,
  type ReportRow,
  type RowLine,
  type RowMark,
  type Slide,
  type Tone,
  type VitalCardData,
  chapterName,
  fmt,
  pad2,
} from './slides';

const RATING: readonly [string, string, string] = [
  'var(--m-mark-success)',
  'var(--m-mark-warning)',
  'var(--m-mark-danger)',
];
const RATING_LABEL = ['Good', 'Needs improvement', 'Poor'] as const;
const EFFORT_LABEL = ['Small effort', 'Medium effort', 'High effort'] as const;

/** Prose with `**figure**` marks (the notes). */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function words(t: string): ReactNode {
  return t.split(/(\d[\d.,:]*)/).map((p, i) =>
    !p ? null : /^\d/.test(p) ? (
      <Fragment key={i}>{p}</Fragment>
    ) : (
      <span key={i} className="w">
        {p}
      </span>
    ),
  );
}

/** Digits in the figure face, a trailing unit at half size: "500ms", "4.7%". */
export function Figure({ v }: { v: string }) {
  const m = /^(.*\d)\s?(ms|s|%|pts|×|min)$/.exec(v);
  if (!m) return <>{words(v)}</>;
  return (
    <>
      {words(m[1]!)}
      <small className="u">{m[2]}</small>
    </>
  );
}

/** One line cut in the middle, so a URL or an id keeps both its start and its end. */
function Middle({
  text,
  as: Tag = 'span',
  className,
}: {
  text: string;
  as?: 'span' | 'code';
  className?: string;
}) {
  const t = text.replace(/\s+/g, ' ').trim();
  const cut = t.length - Math.min(28, Math.ceil(t.length / 3));
  return (
    <Tag
      className={`m-rep-s__mid${className ? ` ${className}` : ''}`}
      title={t}
    >
      <span>{t.slice(0, cut)}</span>
      <span>{t.slice(cut)}</span>
    </Tag>
  );
}

const oneWord = (t: string) => !/\s/.test(t.trim());

function Effort({ n }: { n: 1 | 2 | 3 }) {
  const filled = 4 - n;
  return (
    <span
      className="m-rep-s__effort"
      role="img"
      aria-label={EFFORT_LABEL[n - 1]}
    >
      {[1, 2, 3].map((k) => (
        <i key={k} className={k <= filled ? 'on' : ''} />
      ))}
    </span>
  );
}

function Stack({
  parts,
  height,
}: {
  parts: Array<[number, string]>;
  height: number;
}) {
  return (
    <span
      className="m-rep-s__stack"
      style={{ height, borderRadius: height / 2 }}
    >
      {parts
        .filter((p) => p[0] > 0)
        .map((p, i) => (
          <i key={i} style={{ flex: `${p[0]} 1 0`, background: p[1] }} />
        ))}
    </span>
  );
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <div className="m-rep-s__facts">
      {facts.map(([v, l]) => (
        <div key={`${v}${l}`}>
          <span className={`num${v.length > 6 ? ' is-long' : ''}`}>
            <Figure v={v} />
          </span>
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}

function Mark({ mark }: { mark: RowMark }) {
  const inner =
    mark.kind === 'user' ? (
      <SessionAvatar seed={mark.seed} size={32} />
    ) : mark.kind === 'flag' ? (
      <span className="m-rep-s__cc">
        {/^[A-Za-z]{2}$/.test(mark.cc) ? (
          <CountryFlagIcon
            countryCode={mark.cc.toUpperCase()}
            style={{ width: 30, height: 20 }}
          />
        ) : (
          mark.cc.slice(0, 3).toUpperCase() || '??'
        )}
      </span>
    ) : mark.kind === 'browser' ? (
      <BrowserIcon name={mark.name} size={24} />
    ) : mark.device === 'monitor' ? (
      <Monitor size={24} strokeWidth={1.75} />
    ) : mark.device === 'phone' ? (
      <Smartphone size={24} strokeWidth={1.75} />
    ) : (
      <MonitorSmartphone size={24} strokeWidth={1.75} />
    );
  return <span className="m-rep-s__mark">{inner}</span>;
}

function Journeys({ journeys }: { journeys: string[] }) {
  if (!journeys.length) return null;
  return (
    <Tooltip
      title={
        <span className="flex flex-col gap-2">
          {journeys.map((j, i) => (
            <span key={i}>{j}</span>
          ))}
        </span>
      }
    >
      <span className="m-rep-s__jn" tabIndex={0}>
        <span className="m-truncate">{journeys[0]}</span>
        {journeys.length > 1 && <b className="num">+{journeys.length - 1}</b>}
      </span>
    </Tooltip>
  );
}

function Line({ line, journeys }: { line: RowLine; journeys?: string[] }) {
  switch (line.kind) {
    case 'bar':
      return (
        <div className="m-rep-s__line">
          <span className="m-rep-s__bar">
            <i
              style={{ width: `${Math.max(0.6, Math.min(100, line.pct))}%` }}
            />
          </span>
          <span>
            <span className="num pv">
              <Figure v={line.value} />
            </span>
            {line.unit ? ` ${line.unit}` : ''}
            {line.rest && <span className="pm"> · {line.rest}</span>}
          </span>
        </div>
      );
    case 'impact':
      return (
        <div className="m-rep-s__line">
          <ImpactMeter level={line.level} />
          <span className="pm">{line.text}</span>
          {journeys && <Journeys journeys={journeys} />}
        </div>
      );
    case 'outcome':
      return (
        <div className="m-rep-s__outcome">
          <span>How it ended</span>
          <span>
            <b className="num">{line.shares[0]}%</b> completed
          </span>
          <span>
            <b className="num">{line.shares[1]}%</b> partly
          </span>
          <span>
            <b className="num">{line.shares[2]}%</b> dropped off
          </span>
        </div>
      );
    case 'pairs':
      return (
        <div className="m-rep-s__pairs">
          {line.pairs.map(([k, v], i) => (
            <Fragment key={k}>
              {i > 0 && <i />}
              {k} <b className="num">{v}</b>
            </Fragment>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function Rows({ rows, start = 0 }: { rows: ReportRow[]; start?: number }) {
  const list = useRef<HTMLOListElement>(null);
  const [cut, setCut] = useState<{ rows: ReportRow[]; titles: string[] }>();
  const titles = cut?.rows === rows ? cut.titles : undefined;
  const wraps = rows.some((r) => r.wrap);
  useLayoutEffect(() => {
    const body = list.current?.closest<HTMLElement>('.m-rep-s__body');
    if (!wraps || !body) return;
    let live = true;
    // wrapped titles give up lines, longest first, until the slide holds them; the text
    // itself is cut (not line-clamp, which the PDF rasteriser drops) so every output matches
    void document.fonts.ready.then(() => {
      const ts = Array.from(body.querySelectorAll<HTMLElement>('.t.is-wrap'));
      const lh = ts[0] && parseFloat(getComputedStyle(ts[0]).lineHeight);
      if (!live || !lh) return;
      let n = Math.max(...ts.map((t) => Math.round(t.offsetHeight / lh)));
      const fits = (t: HTMLElement) => t.offsetHeight <= n * lh + 1;
      while (n > 1 && body.scrollHeight > body.clientHeight) {
        n--;
        ts.forEach((t) => (t.style.maxHeight = `${n * lh}px`));
      }
      ts.forEach((t) => t.style.removeProperty('max-height'));
      const next = rows.map((r) => r.title);
      for (const t of ts) {
        const full = t.textContent ?? '';
        if (fits(t)) continue;
        let lo = 0;
        let hi = full.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          t.textContent = `${full.slice(0, mid).trimEnd()}…`;
          if (fits(t)) lo = mid;
          else hi = mid - 1;
        }
        t.textContent = full;
        const sp = full.lastIndexOf(' ', lo);
        const end = sp > 0 && sp > lo - 30 ? sp : lo;
        next[Number(t.dataset.i)] = `${full.slice(0, end).trimEnd()}…`;
      }
      setCut({ rows, titles: next });
    });
    return () => {
      live = false;
    };
  }, [rows, wraps]);
  return (
    <ol className="m-rep-s__rows" ref={list}>
      {rows.map((r, i) => {
        const issue = r.journeys != null;
        const title =
          !issue && (r.mono || oneWord(r.title)) ? (
            <Middle text={r.title} />
          ) : (
            <span
              className={
                issue
                  ? 't m-truncate'
                  : r.unlabelled
                    ? 't m-rep-s__unl'
                    : r.wrap
                      ? 't is-wrap'
                      : 't'
              }
              title={r.code || r.wrap ? r.title : undefined}
              data-i={r.wrap ? i : undefined}
            >
              {titles?.[i] ?? r.title}
            </span>
          );
        return (
          <li
            key={`${r.title}-${i}`}
            className={`m-rep-s__row${issue ? ' is-issue' : ''}`}
          >
            <span className="in num">{pad2(start + i + 1)}</span>
            <div>
              <b className={`m-rep-s__rt${r.mono ? ' is-mono' : ''}`}>
                {r.mark && <Mark mark={r.mark} />}
                {r.critical && (
                  <TriangleAlert
                    className="m-rep-s__crit"
                    size={18}
                    role="img"
                    aria-label="Flagged critical"
                  />
                )}
                {r.code ? (
                  <span className={`m-rep-s__tc${r.wrap ? ' is-wrap' : ''}`}>
                    {title}
                    <Middle as="code" text={r.code} />
                  </span>
                ) : (
                  title
                )}
                {r.effort && <Effort n={r.effort} />}
                {r.tag && (
                  <Chip
                    kind="status"
                    tone={
                      r.tag.tone === 'bad'
                        ? 'danger'
                        : r.tag.tone === 'good'
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    {r.tag.text}
                  </Chip>
                )}
              </b>
              {r.description &&
                (issue ? (
                  <Tooltip title={r.description}>
                    <p tabIndex={0}>{r.description}</p>
                  </Tooltip>
                ) : (
                  <p>{r.description}</p>
                ))}
              {r.lines?.map((l, k) => (
                <Line
                  key={k}
                  line={l}
                  journeys={l.kind === 'impact' ? r.journeys : undefined}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="m-rep-s__kpi">
      <div className="l">{kpi.label}</div>
      <div className={`v${kpi.value === '–' ? ' na' : ''}`}>
        <Figure v={kpi.value} />
        {kpi.unit && <small>{kpi.unit}</small>}
      </div>
      {kpi.delta && (
        <div className="d">
          <Pill tone={kpi.delta.tone}>
            <Figure v={kpi.delta.text} />
          </Pill>
          <span>vs {kpi.delta.vs}</span>
        </div>
      )}
      {kpi.note && <div className="n">{kpi.note}</div>}
      {kpi.spark && <Spark values={kpi.spark} />}
      {kpi.split && (
        <div className="m-rep-s__split">
          <div style={{ display: 'flex' }}>
            <Stack
              parts={kpi.split.map((p, i) => [
                p.value,
                i ? 'var(--m-chart-2)' : 'var(--m-chart-1)',
              ])}
              height={10}
            />
          </div>
          <div className="m-rep-s__split-k">
            {kpi.split.map((p, i) => (
              <span key={p.label}>
                <i
                  style={{
                    background: i ? 'var(--m-chart-2)' : 'var(--m-chart-1)',
                  }}
                />
                {p.label} <b className="num">{fmt(p.value)}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VitalCard({ v }: { v: VitalCardData }) {
  const d = v.device;
  return (
    <div className="m-rep-v">
      <div className="m-rep-v__head">
        <span className="m-rep-v__key">{v.key}</span>
        <span className="m-rep-v__name">{v.name}</span>
        {d && (
          <span className="m-rep-v__loads num">
            <Figure v={`${fmt(d.loads)} loads`} />
          </span>
        )}
      </div>
      <span className="m-rep-v__limits">{v.limits}</span>
      {!d ? (
        <p className="m-rep-v__none">No page loads with this measure.</p>
      ) : (
        <>
          <div className="m-rep-v__main">
            <span className="m-rep-v__avg num">
              <Figure v={d.avg} />
            </span>
            {d.rating != null && (
              <span className="m-rep-v__rate">
                <i style={{ background: RATING[d.rating] }} />
                {RATING_LABEL[d.rating]}
              </span>
            )}
          </div>
          <div className="m-rep-v__sub">
            {d.delta && (
              <>
                <Pill tone={d.delta.tone}>
                  <Figure v={d.delta.text} />
                </Pill>
                <span>average</span>
              </>
            )}
            <span className="m-rep-v__p75">
              P75{' '}
              <b className="num">
                <Figure v={d.p75} />
              </b>
            </span>
          </div>
          <div className="m-rep-v__dist">
            <div className="m-rep-v__bar">
              <Stack
                parts={d.shares.map((x, i): [number, string] => [
                  x,
                  RATING[i] ?? '',
                ])}
                height={8}
              />
            </div>
            <div className="m-rep-v__shares">
              {d.shares.map((x, i) => (
                <span key={i}>
                  <i style={{ background: RATING[i] }} />
                  <b className="num">{x}%</b>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MatrixTable({ slide }: { slide: Extract<Slide, { kind: 'matrix' }> }) {
  const few = slide.columns.length <= 4;
  return (
    <table className={`m-rep-mx${few ? ' is-few-cols' : ''}`}>
      <thead>
        <tr>
          <th className="m-rep-mx__lead">{slide.lead}</th>
          {slide.columns.map((c, i) => (
            <th
              key={`${c.label}${i}`}
              className={`${i === 0 ? 'is-base' : ''}${c.few ? ' is-few' : ''}`}
            >
              <span>{c.label}</span>
              {c.sub && <small>{c.sub}</small>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slide.rows.map((row, ri) => (
          <tr key={`${row.title}${ri}`}>
            <td className="m-rep-mx__lead">
              <span className="m-rep-mx__n num">
                {pad2((slide.start ?? 0) + ri + 1)}
              </span>
              <span className="m-rep-mx__t">
                {row.title}
                {row.note && (
                  <small className="num">
                    <Figure v={row.note} />
                  </small>
                )}
              </span>
            </td>
            {row.values.map((v, i) => {
              const gap = Math.round((v - row.values[0]!) * 10) / 10;
              const tone =
                i === 0
                  ? 'base'
                  : gap >= slide.threshold
                    ? 'up'
                    : gap <= -slide.threshold
                      ? 'down'
                      : 'even';
              const strength =
                i === 0 || Math.abs(gap) < 2
                  ? 0
                  : Math.min(1, Math.abs(gap) / 10);
              const ink = gap > 0 ? 'var(--m-chart-1)' : 'var(--m-chart-2)';
              return (
                <td
                  key={i}
                  className={`is-${tone}${slide.columns[i]?.few ? ' is-few' : ''}`}
                  style={
                    strength
                      ? {
                          background: `color-mix(in oklab, ${ink} ${Math.round(6 + strength * 34)}%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <span className="m-rep-mx__cell">
                    <span className="m-rep-mx__v num">
                      <Figure v={`${v}%`} />
                    </span>
                    {i > 0 && (
                      <span className="m-rep-mx__gap num">
                        <Figure
                          v={
                            gap === 0
                              ? 'same'
                              : `${gap > 0 ? '+' : '−'}${Math.abs(gap)} pts`
                          }
                        />
                      </span>
                    )}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Unverified({ numbers }: { numbers?: string[] }) {
  if (!numbers?.length) return null;
  return (
    <div className="m-rep-s__flag">
      <b>Check these numbers.</b> {numbers.join(', ')} could not be matched to
      the report’s figures.
    </div>
  );
}

export interface ReportSlideProps {
  slide: Slide;
  index: number;
  slides: Slide[];
  meta: DeckMeta;
  onGo: (index: number) => void;
}

export function ReportSlide({
  slide,
  index,
  slides,
  meta,
  onGo,
}: ReportSlideProps) {
  const sec = chapterName(slide.section, slides);
  const chapter =
    slide.section !== 'intro' && slide.section !== 'notes'
      ? slide.section
      : null;
  const firstOf = (key: Slide['section']) =>
    slides.findIndex((s) => s.section === key);
  const label = `${index + 1} of ${slides.length}: ${slide.short}`;
  const top = (
    <div className="m-rep-s__top">
      <nav className="m-rep-s__crumbs" aria-label="Breadcrumbs">
        <button type="button" className="is-root" onClick={() => onGo(0)}>
          <OpenReplayMark size={17} variant="brand" />
          <span className="m-truncate">{meta.title} audit</span>
        </button>
        <span className="sep">/</span>
        <button type="button" onClick={() => onGo(firstOf(slide.section))}>
          {sec.name}
        </button>
        <span className="sep">/</span>
        <span className="here">{slide.short}</span>
      </nav>
      <button type="button" className="m-rep-s__page" onClick={() => onGo(1)}>
        <Figure v={`${pad2(index + 1)} / ${pad2(slides.length)}`} />
      </button>
    </div>
  );
  const foot = (
    <div className="m-rep-s__foot">
      <span className="m-rep-s__src">
        {slide.ai && (
          <span className="m-rep-s__ai">
            AI insight{slide.foot ? ' · ' : ''}
          </span>
        )}
        {slide.foot}
      </span>
      <span className="m-rep-s__org">{meta.organization}</span>
    </div>
  );
  const aside = slide.effortLegend ? (
    <span className="m-rep-s__legend is-top">
      {([1, 2, 3] as const).map((n) => (
        <span key={n}>
          <Effort n={n} />
          {EFFORT_LABEL[n - 1]}
        </span>
      ))}
    </span>
  ) : slide.kind === 'vitals' ? (
    <span className="m-rep-s__legend is-top">
      {RATING_LABEL.map((l, i) => (
        <span key={l}>
          <i style={{ background: RATING[i] }} />
          {l}
        </span>
      ))}
    </span>
  ) : null;
  const head = (
    <div className={`m-rep-s__head${aside ? ' has-aside' : ''}`}>
      <div>
        <div className="m-rep-s__eyebrow">
          {chapter && <SectionIcon section={chapter} size={14} />}
          {sec.n ? `${sec.n} · ${sec.name}` : sec.name}
        </div>
        <h1 className="m-rep-s__title">{slide.title}</h1>
      </div>
      {aside}
    </div>
  );
  const frame = (body: ReactNode, cls = '') => (
    <section
      className={`m-rep-s${cls}`}
      aria-roledescription="slide"
      aria-label={label}
    >
      {top}
      {head}
      <div className="m-rep-s__body">{body}</div>
      {foot}
    </section>
  );

  switch (slide.kind) {
    case 'cover':
      return (
        <section
          className="m-rep-s m-rep-s--cover"
          aria-roledescription="slide"
          aria-label={label}
        >
          <BotMosaic seed={meta.title} />
          <span className="m-rep-s__brand">
            <OpenReplayMark size={41} variant="brand" />
            OpenReplay
          </span>
          <div className="m-rep-s__hero">
            <div className="m-rep-s__eyebrow">
              {[meta.organization, 'Audit', meta.period]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <h1>
              {meta.title}
              {meta.month && (
                <>
                  <br />
                  {meta.month}
                </>
              )}
            </h1>
            {meta.sessions != null && (
              <p className="m-rep-s__counts">
                <span className="num">{fmt(meta.sessions)}</span> sessions
                {meta.users != null && (
                  <>
                    <i />
                    <span className="num">{fmt(meta.users)}</span> users
                  </>
                )}
              </p>
            )}
            <div className="m-rep-s__meta">
              {meta.period && (
                <div>
                  Period<b>{meta.period}</b>
                </div>
              )}
              {meta.project && (
                <div>
                  Project<b>{meta.project}</b>
                </div>
              )}
              {meta.generated && (
                <div>
                  Generated<b>{meta.generated}</b>
                </div>
              )}
              {meta.createdBy && (
                <div>
                  Created by<b>{meta.createdBy}</b>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    case 'contents': {
      const chapters = CHAPTERS.filter((c) =>
        slides.some((s) => s.section === c.key),
      );
      return frame(
        <div className="m-rep-s__toc">
          {chapters.map((c, ci) => {
            const at = slides.flatMap((s, i) =>
              s.section === c.key ? [i] : [],
            );
            const first = at[0]!;
            const last = at[at.length - 1]!;
            return (
              <section key={c.key}>
                <button
                  type="button"
                  className="m-rep-s__toc-head"
                  onClick={() => onGo(first)}
                >
                  <span className="m-rep-s__toc-mark">
                    <span className="ic">
                      <SectionIcon section={c.key} size={20} />
                    </span>
                    <span className="n">{pad2(ci + 1)}</span>
                  </span>
                  <b>{c.name}</b>
                  <span className="p">
                    {first === last
                      ? `Page ${pad2(first + 1)}`
                      : `Pages ${pad2(first + 1)}–${pad2(last + 1)}`}
                  </span>
                </button>
                <ul>
                  {at.map((i) => (
                    <li key={i}>
                      <button type="button" onClick={() => onGo(i)}>
                        {slides[i]!.short}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>,
      );
    }
    case 'insight':
      return (
        <section
          className="m-rep-s m-rep-s--insight"
          aria-roledescription="slide"
          aria-label={label}
        >
          {slide.art && (
            <span className="m-rep-s__art is-small">
              <Illustration subject={slide.art} robot size="page" width={440} />
            </span>
          )}
          {top}
          <div className="m-rep-s__ins">
            <div className="m-rep-s__eyebrow">
              {chapter && <SectionIcon section={chapter} size={14} />}
              Insight · {sec.n ? `${sec.n} · ${sec.name}` : sec.name}
            </div>
            <p className="m-rep-s__quote">
              {slide.parts.map((p, i) =>
                p.em ? (
                  <strong key={i}>{p.text}</strong>
                ) : (
                  <Fragment key={i}>{p.text}</Fragment>
                ),
              )}
            </p>
          </div>
          {foot}
        </section>
      );
    case 'summary':
      return frame(
        <>
          <Unverified numbers={slide.unverified} />
          <div className="m-rep-s__points">
            {slide.points.map((p, i) => (
              <div key={`${p.figure}${i}`} className="m-rep-s__point">
                <span className={`num${p.tone ? ` is-${p.tone}` : ''}`}>
                  <Figure v={p.figure} />
                </span>
                <p>
                  <strong>{p.lead}</strong> {p.text}
                </p>
              </div>
            ))}
          </div>
        </>,
      );
    case 'kpis': {
      const n = slide.kpis.length;
      const layout = n >= 5 ? 'six' : n === 4 ? 'four' : 'three';
      return frame(
        <div
          className={`m-rep-s__kpis m-rep-s__kpis--${layout}`}
          style={
            n < 3 ? { gridTemplateColumns: `repeat(${n}, 1fr)` } : undefined
          }
        >
          {slide.kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>,
      );
    }
    case 'list':
      return frame(
        <>
          <Unverified numbers={slide.unverified} />
          <div
            className={`m-rep-s__iwrap${slide.facts.length ? '' : ' is-wide'}`}
          >
            {slide.facts.length > 0 && <Facts facts={slide.facts} />}
            <Rows rows={slide.rows} start={slide.start} />
          </div>
        </>,
      );
    case 'vitals':
      return frame(
        <div className="m-rep-s__vitals">
          {slide.vitals.map((v) => (
            <VitalCard key={v.key} v={v} />
          ))}
        </div>,
      );
    case 'matrix':
      return frame(<MatrixTable slide={slide} />);
    case 'features':
      return frame(
        <div className="m-rep-s__fwrap">
          <figure className="m-rep-s__chart">
            <figcaption className="m-rep-s__ay">
              {slide.chart === 'scatter'
                ? 'Frequency: share of all interactions'
                : 'Average uses per person'}
            </figcaption>
            {slide.chart === 'scatter' ? (
              <ScatterChart features={slide.features} />
            ) : (
              <IntensityChart features={slide.features} />
            )}
            <figcaption className="m-rep-s__ax">
              {slide.chart === 'scatter'
                ? 'Popularity: share of people who used it'
                : 'Feature, numbered as in the key'}
            </figcaption>
          </figure>
          <div>
            <ol className="m-rep-s__key">
              {slide.features.map((f) => (
                <li key={f.n}>
                  <span
                    className="k"
                    style={{ background: KIND_COLOR[f.kind] }}
                  >
                    {f.n}
                  </span>
                  {oneWord(f.name) ? (
                    <Middle
                      className={`t${f.kind === 'page' && f.name.startsWith('/') ? ' num' : ''}`}
                      text={f.name}
                    />
                  ) : (
                    <span className="t" title={f.name}>
                      {f.name}
                    </span>
                  )}
                  <span className="v num">
                    <Figure
                      v={
                        slide.chart === 'scatter'
                          ? `${Math.round(f.popularity * 10) / 10}%`
                          : `${Math.round(f.perPerson * 10) / 10}×`
                      }
                    />
                  </span>
                </li>
              ))}
            </ol>
            <div className="m-rep-s__kinds">
              {[...new Set(slide.features.map((f) => f.kind))].map((k) => (
                <span key={k}>
                  <i style={{ background: KIND_COLOR[k] }} />
                  {KIND_LABEL[k]}
                </span>
              ))}
            </div>
          </div>
        </div>,
      );
    case 'retention':
      return frame(
        <div className="m-rep-s__fwrap">
          <figure className="m-rep-s__chart">
            <figcaption className="m-rep-s__ay">
              Share of people back
            </figcaption>
            {slide.points.length ? (
              <RetentionChart points={slide.points} unit={slide.unit} />
            ) : (
              <p className="m-rep-s__empty">
                The period is too short to show people coming back.
              </p>
            )}
            <figcaption className="m-rep-s__ax">
              {slide.unit === 'week' ? 'Weeks' : 'Days'} after their first visit
            </figcaption>
          </figure>
          <Facts facts={slide.facts} />
        </div>,
      );
    case 'notes':
      return frame(
        <ol className="m-rep-s__notes">
          {slide.notes.map(([title, text], i) => (
            <li key={title}>
              <span className="num">{pad2(i + 1)}</span>
              <div>
                <b>{title}</b>
                <p>
                  <Rich text={text} />
                </p>
              </div>
            </li>
          ))}
        </ol>,
      );
    case 'message':
      return frame(
        <p className={`m-rep-s__message${slide.failed ? ' is-failed' : ''}`}>
          {slide.failed && <b>This part could not be built. </b>}
          {slide.text}
        </p>,
      );
    default:
      return null;
  }
}

const MOSAIC_COLS = 9;
const MOSAIC_ROWS = 8;
const mosaicShown = (i: number) => {
  const r = Math.floor(i / MOSAIC_COLS);
  const c = i % MOSAIC_COLS;
  return !(MOSAIC_COLS - c + (MOSAIC_ROWS - r) * 1.2 > 13 && (i * 7) % 5 !== 0);
};
const MOSAIC_LIT: ReadonlySet<number> = (() => {
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return seed / 0x100000000;
  };
  const lit = new Set<number>();
  for (let br = 0; br < MOSAIC_ROWS; br += 3) {
    for (let bc = 0; bc < MOSAIC_COLS; bc += 3) {
      const cells: number[] = [];
      for (let r = br; r < Math.min(br + 3, MOSAIC_ROWS); r++)
        for (let c = bc; c < Math.min(bc + 3, MOSAIC_COLS); c++) {
          const i = r * MOSAIC_COLS + c;
          const touches = [i - 1, i + 1, i - MOSAIC_COLS, i + MOSAIC_COLS].some(
            (n) => lit.has(n),
          );
          if (mosaicShown(i) && !touches) cells.push(i);
        }
      if (cells.length) lit.add(cells[Math.floor(rand() * cells.length)]!);
    }
  }
  return lit;
})();

function BotMosaic({ seed }: { seed: string }) {
  return (
    <span className="m-rep-s__mosaic" aria-hidden="true">
      {Array.from({ length: MOSAIC_COLS * MOSAIC_ROWS }, (_, i) => {
        const r = Math.floor(i / MOSAIC_COLS);
        const c = i % MOSAIC_COLS;
        if (!mosaicShown(i)) return <span key={i} className="m-rep-s__mcell" />;
        const reach =
          (c / (MOSAIC_COLS - 1)) * 0.5 + (r / (MOSAIC_ROWS - 1)) * 0.5;
        const jitter = (((i * 2654435761) >>> 0) % 100) / 100 - 0.5;
        const step = Math.max(
          0,
          Math.min(3, Math.round(reach * 3 + jitter * 1.6)),
        );
        return (
          <span
            key={i}
            className={`m-rep-s__mcell${MOSAIC_LIT.has(i) ? ' is-lit' : ''}`}
            style={
              { '--tile': [0.07, 0.13, 0.2, 0.28][step] } as React.CSSProperties
            }
          >
            <SessionAvatar seed={`${seed}-${i * 37 + 11}`} size={46} />
          </span>
        );
      })}
    </span>
  );
}
