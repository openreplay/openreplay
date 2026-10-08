import { Button } from '@/ui/actions/button';
import { StatTile } from '@/ui/data/StatTile';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ChevronLeft, Copy, Download } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatMs } from 'App/date';
import { formatBytes } from 'App/utils';

import { NetworkRequest } from '../shared/types';
import './network-panel.css';

const ROW_PAGE = 200;

// A stripped HAR-file-viewer: type filter chips, a clickable request list, and a detail
// view with headers, payload, response and timing. Clicking a request REPLACES the list
// with the detail, so the panel's height stays predictable.

const isNetError = (r: NetworkRequest) => r.status === 0 || r.status >= 400;

type Cat = 'xhr' | 'js' | 'css' | 'img' | 'media' | 'font' | 'doc' | 'other';
const categoryOf = (r: NetworkRequest): Cat => {
  switch (r.type) {
    case 'xhr':
    case 'fetch':
      return 'xhr';
    case 'script':
      return 'js';
    case 'stylesheet':
      return 'css';
    case 'img':
      return 'img';
    case 'media':
      return 'media';
    case 'font':
      return 'font';
    case 'document':
      return 'doc';
    default:
      return 'other';
  }
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'xhr', label: 'XHR' },
  { key: 'js', label: 'JS' },
  { key: 'css', label: 'CSS' },
  { key: 'img', label: 'Img' },
  { key: 'media', label: 'Media' },
  { key: 'font', label: 'Font' },
  { key: 'doc', label: 'Doc' },
  { key: 'other', label: 'Other' },
  { key: 'errors', label: 'Errors' },
];

// Thin wrappers over the shared formatters that keep the panel's "—" for missing values.
const fmtBytes = (n?: number) => (n == null ? '—' : formatBytes(n));
const fmtMs = (n?: number) => (n == null ? '—' : formatMs(n));
// When a request fired, relative to the run start.
const fmtOffset = (ms?: number) =>
  ms == null
    ? '—'
    : ms < 1000
      ? `+${Math.round(ms)}ms`
      : `+${(ms / 1000).toFixed(1)}s`;

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};
const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
};

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Server Error',
  502: 'Bad Gateway',
  503: 'Unavailable',
};

function HeaderRows({ rows }: { rows?: { name: string; value: string }[] }) {
  const { t } = useTranslation();
  if (!rows || rows.length === 0)
    return <p className="m-rd__none">{t('Nothing to show.')}</p>;
  return (
    <div className="m-net__kv">
      {rows.map((h, i) => (
        // header names repeat (set-cookie, link…), so the index is part of the key
        <div key={`${h.name}-${i}`} className="m-net__kv-row">
          <span className="m-net__kv-k">{h.name}</span>
          <span className="m-net__kv-v">{h.value}</span>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ text }: { text?: string }) {
  const { t } = useTranslation();
  if (!text) return <p className="m-rd__none">{t('Nothing to show.')}</p>;
  return <pre className="m-net__code">{text}</pre>;
}

type DetailTab =
  | 'reqHeaders'
  | 'resHeaders'
  | 'payload'
  | 'response'
  | 'timing';

function Detail({
  req,
  startedAt,
  onClose,
}: {
  req: NetworkRequest;
  startedAt?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<DetailTab>('reqHeaders');
  const errored = isNetError(req);

  const offset = fmtOffset(req.time);
  const absoluteStart =
    startedAt != null
      ? new Date(startedAt + req.time).toLocaleTimeString(undefined, {
          hour12: false,
        })
      : null;

  const tabs: { key: DetailTab; label: string; count?: number }[] = [
    {
      key: 'reqHeaders',
      label: t('Request headers'),
      count: req.requestHeaders?.length,
    },
    {
      key: 'resHeaders',
      label: t('Response headers'),
      count: req.responseHeaders?.length,
    },
    { key: 'payload', label: t('Payload') },
    { key: 'response', label: t('Response') },
    { key: 'timing', label: t('Timing') },
  ];

  const copyUrl = () => {
    navigator.clipboard?.writeText(req.url);
    toast.success(t('URL copied'));
  };

  const timingRows: { label: string; value?: number }[] = [
    { label: t('DNS lookup'), value: req.timing?.dns },
    { label: t('Initial connection'), value: req.timing?.connect },
    { label: t('SSL/TLS'), value: req.timing?.ssl },
    { label: t('Waiting (TTFB)'), value: req.timing?.ttfb },
    { label: t('Content download'), value: req.timing?.download },
  ].filter((r) => r.value != null);

  return (
    <div className="m-net__detail">
      {/* the detail replaces the list, so the way out is "back", not "close" */}
      <button type="button" onClick={onClose} className="m-net__back">
        <ChevronLeft size={14} /> {t('Back to requests')}
      </button>

      <div className="m-net__card">
        <div className="m-net__head">
          <span className={`m-net__code-chip${errored ? ' is-bad' : ''}`}>
            {req.status === 0
              ? t('ERR')
              : `${req.status} ${STATUS_TEXT[req.status] ?? ''}`.trim()}
          </span>
          <span className="m-net__method-lg">{req.method}</span>
          {req.protocol && <span className="m-net__muted">{req.protocol}</span>}
        </div>
        <span className="m-net__muted">
          {hostOf(req.url)}
          {req.ip ? ` · ${req.ip}` : ''}
        </span>
        <span className="m-net__path">{pathOf(req.url)}</span>
        <button type="button" onClick={copyUrl} className="m-net__copy">
          <Copy size={12} /> {t('Copy full URL')}
        </button>

        <div className="m-net__stats">
          <StatTile value={fmtBytes(req.size)} label={t('Size')} />
          <StatTile value={fmtMs(req.duration)} label={t('Total time')} />
          <StatTile value={req.type} label={t('Type')} />
          <StatTile
            value={
              absoluteStart ? (
                <Tooltip title={absoluteStart}>
                  <span>{offset}</span>
                </Tooltip>
              ) : (
                offset
              )
            }
            label={t('Started')}
          />
        </div>

        <FilterStrip
          label={t('Request details')}
          items={tabs.map((tb) => ({
            key: tb.key,
            label: tb.label,
            count: tb.count,
          }))}
          selected={[tab]}
          onSelect={(k) => setTab(k as DetailTab)}
        />

        <div>
          {tab === 'reqHeaders' && <HeaderRows rows={req.requestHeaders} />}
          {tab === 'resHeaders' && <HeaderRows rows={req.responseHeaders} />}
          {tab === 'payload' && <CodeBlock text={req.payload} />}
          {tab === 'response' && <CodeBlock text={req.response} />}
          {tab === 'timing' &&
            (timingRows.length === 0 ? (
              <p className="m-rd__none">{t('No timing captured.')}</p>
            ) : (
              <div className="m-net__kv">
                {timingRows.map((r) => (
                  <div key={r.label} className="m-net__kv-row is-timing">
                    <span className="m-net__kv-k">{r.label}</span>
                    <span className="m-net__kv-v">{fmtMs(r.value)}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function NetworkPanel({
  reqs,
  startedAt,
  fillHeight,
  onDownload,
}: {
  reqs?: NetworkRequest[];
  startedAt?: number;
  /** fill the parent's fixed height (expand modal) — list/detail scroll inside */
  fillHeight?: boolean;
  /** download the captured .HAR — omitted when the run captured none */
  onDownload?: () => void;
}) {
  const { t } = useTranslation();
  // default to the Errors filter when the run has failures, so they're front-and-centre
  const [filter, setFilter] = useState(() =>
    (reqs ?? []).some(isNetError) ? 'errors' : 'all',
  );
  const [selected, setSelected] = useState<number | null>(null);

  const errorCount = useMemo(
    () => (reqs ?? []).filter(isNetError).length,
    [reqs],
  );

  // carry each request's index in `reqs` so the row can select it without a lookup
  // a HAR can hold thousands of requests: draw a page at a time (per filter)
  const [pager, setPager] = useState({ filter, limit: ROW_PAGE });
  const limit = pager.filter === filter ? pager.limit : ROW_PAGE;
  const visible = useMemo(() => {
    const all = (reqs ?? []).map((r, idx) => ({ r, idx }));
    if (filter === 'all') return all;
    if (filter === 'errors') return all.filter(({ r }) => isNetError(r));
    return all.filter(({ r }) => categoryOf(r) === filter);
  }, [reqs, filter]);

  if (!reqs || reqs.length === 0)
    return (
      <p className="m-rd__none">
        {t('No network activity captured for this run.')}
      </p>
    );

  const cur = selected != null ? reqs[selected] : null;

  // the detail REPLACES the list — one view at a time, stable height
  if (cur)
    return (
      <div className={fillHeight ? 'h-full overflow-y-auto' : undefined}>
        <Detail
          req={cur}
          startedAt={startedAt}
          onClose={() => setSelected(null)}
        />
      </div>
    );

  return (
    <div className={`m-net${fillHeight ? ' is-fill' : ''}`}>
      <div className="m-net__bar">
        <FilterStrip
          label={t('Filter requests')}
          items={FILTERS.map((f) => ({
            key: f.key,
            label: t(f.label),
            count:
              f.key === 'errors' && errorCount > 0 ? errorCount : undefined,
          }))}
          selected={[filter]}
          onSelect={setFilter}
        />
        <Tooltip title={t('Download the captured network as a .HAR file')}>
          <span>
            <Button disabled={!onDownload} onClick={onDownload}>
              <Download size={13} />
              {t('.HAR')}
            </Button>
          </span>
        </Tooltip>
      </div>

      <div className="m-net__list">
        <div className="m-net__row is-head">
          <span>{t('Status')}</span>
          <span>{t('Method')}</span>
          <span>{t('Request')}</span>
          <Tooltip title={t('When it fired, relative to the run start')}>
            <span className="is-num is-wide">{t('At')}</span>
          </Tooltip>
          <span className="is-num is-wide">{t('Size')}</span>
          <span className="is-num">{t('Time')}</span>
        </div>
        {visible.length === 0 ? (
          <p className="m-net__empty">{t('No requests match this filter.')}</p>
        ) : (
          visible.slice(0, limit).map(({ r, idx }) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(idx)}
              className={`m-net__row${isNetError(r) ? ' is-bad' : ''}`}
            >
              <span className="m-net__status">
                {r.status === 0 ? t('ERR') : r.status}
              </span>
              <span className="m-net__muted">{r.method}</span>
              <span className="m-net__url">
                <span className="m-net__muted">{hostOf(r.url)}</span>{' '}
                {pathOf(r.url)}
              </span>
              <span className="is-num is-wide">{fmtOffset(r.time)}</span>
              <span className="is-num is-wide">{fmtBytes(r.size)}</span>
              <span className="is-num">
                {r.duration ? `${Math.round(r.duration)}ms` : '—'}
              </span>
            </button>
          ))
        )}
        {visible.length > limit && (
          <button
            type="button"
            className="m-net__more"
            onClick={() => setPager({ filter, limit: limit + ROW_PAGE })}
          >
            {t('Show {{n}} more', {
              n: Math.min(ROW_PAGE, visible.length - limit),
            })}
          </button>
        )}
      </div>
    </div>
  );
}

export default NetworkPanel;
