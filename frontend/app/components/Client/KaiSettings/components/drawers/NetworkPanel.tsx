import { Tooltip, message } from 'antd';
import { Copy, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NetworkRequest } from '../shared/types';

// A stripped HAR-file-viewer (per the 06-29 review): type filter chips, a clickable
// request list (no waterfall bars, no legend), and a detail panel with request/response
// headers, payload, response and timing. Mirrors openreplay.com/tools/har-file-viewer.

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

const fmtBytes = (n?: number) => {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
const fmtMs = (n?: number) => (n == null ? '—' : `${Math.round(n)}ms`);

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

const statusColor = (status: number) =>
  isNetError({ status } as NetworkRequest)
    ? 'var(--color-red)'
    : 'var(--color-green-dark)';

// status text: e.g. "200 OK" / "404 Not Found" / "ERR"
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
    return (
      <div className="text-sm text-disabled-text py-3">
        {t('Nothing to show.')}
      </div>
    );
  return (
    <div className="border rounded-lg overflow-hidden divide-y">
      {rows.map((h) => (
        <div
          key={h.name}
          className="flex items-start gap-3 px-3 py-2 text-xs font-mono"
        >
          <span className="w-40 shrink-0 text-gray-dark font-medium break-all">
            {h.name}
          </span>
          <span className="flex-1 min-w-0 text-gray-darkest break-all">
            {h.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ text }: { text?: string }) {
  const { t } = useTranslation();
  if (!text)
    return (
      <div className="text-sm text-disabled-text py-3">
        {t('Nothing to show.')}
      </div>
    );
  return (
    <pre className="border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all bg-gray-lightest max-h-72 overflow-auto">
      {text}
    </pre>
  );
}

type DetailTab = 'reqHeaders' | 'resHeaders' | 'payload' | 'response' | 'timing';

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
  const [tab, setTab] = useState<DetailTab>('reqHeaders');
  const errored = isNetError(req);

  const started =
    startedAt != null
      ? new Date(startedAt + req.time).toLocaleTimeString(undefined, {
          hour12: false,
        })
      : `+${Math.round(req.time)}ms`;

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
    message.success(t('URL copied'));
  };

  const stat = (label: string, value: React.ReactNode) => (
    <div className="border rounded-lg px-3 py-2 min-w-0">
      <div className="text-xs uppercase tracking-wide text-disabled-text">
        {label}
      </div>
      <div className="text-sm font-medium text-black truncate">{value}</div>
    </div>
  );

  const timingRows: { label: string; value?: number }[] = [
    { label: t('DNS lookup'), value: req.timing?.dns },
    { label: t('Initial connection'), value: req.timing?.connect },
    { label: t('SSL/TLS'), value: req.timing?.ssl },
    { label: t('Waiting (TTFB)'), value: req.timing?.ttfb },
    { label: t('Content download'), value: req.timing?.download },
  ].filter((r) => r.value != null);

  return (
    <div className="border rounded-lg p-3 flex flex-col gap-3">
      {/* header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-sm font-medium rounded px-1.5 py-0.5"
              style={{
                background: errored
                  ? 'rgba(204, 0, 0, 0.1)'
                  : 'rgba(66, 174, 94, 0.12)',
                color: statusColor(req.status),
              }}
            >
              {req.status === 0
                ? t('ERR')
                : `${req.status} ${STATUS_TEXT[req.status] ?? ''}`.trim()}
            </span>
            <span className="text-sm font-semibold text-black">
              {req.method}
            </span>
            {req.protocol && (
              <span className="text-xs text-disabled-text">{req.protocol}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-disabled-text">
            {hostOf(req.url)}
            {req.ip ? ` · ${req.ip}` : ''}
          </div>
          <div className="mt-1.5 text-sm font-mono text-black break-all">
            {pathOf(req.url)}
          </div>
          <button
            type="button"
            onClick={copyUrl}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-disabled-text hover:text-black"
          >
            <Copy size={12} /> {t('Copy full URL')}
          </button>
        </div>
        <button
          type="button"
          aria-label={t('Close')}
          onClick={onClose}
          className="shrink-0 text-disabled-text hover:text-black"
        >
          <X size={16} />
        </button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {stat(t('Size'), fmtBytes(req.size))}
        {stat(t('Total time'), fmtMs(req.duration))}
        {stat(t('Type'), req.type)}
        {stat(t('Started'), started)}
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`text-xs font-medium rounded-full px-2.5 py-1 border transition ${
                active
                  ? ''
                  : 'bg-gray-lightest text-gray-dark border-transparent hover:bg-gray-light'
              }`}
              style={
                active
                  ? {
                      background: 'var(--color-active-blue)',
                      borderColor: 'var(--color-teal)',
                      color: 'var(--color-teal)',
                    }
                  : undefined
              }
            >
              {tb.label}
              {tb.count != null && (
                <span className={active ? '' : 'text-disabled-text'}>
                  {' '}
                  ({tb.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'reqHeaders' && <HeaderRows rows={req.requestHeaders} />}
        {tab === 'resHeaders' && <HeaderRows rows={req.responseHeaders} />}
        {tab === 'payload' && <CodeBlock text={req.payload} />}
        {tab === 'response' && <CodeBlock text={req.response} />}
        {tab === 'timing' &&
          (timingRows.length === 0 ? (
            <div className="text-sm text-disabled-text py-3">
              {t('No timing captured.')}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden divide-y">
              {timingRows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <span className="text-gray-dark">{r.label}</span>
                  <span className="font-mono text-gray-darkest">
                    {fmtMs(r.value)}
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

/** Grid columns shared by the request list header + rows. */
const NET_GRID =
  'grid items-center gap-2 grid-cols-[52px_56px_minmax(0,1fr)_64px_60px]';

function NetworkPanel({
  reqs,
  startedAt,
}: {
  reqs?: NetworkRequest[];
  startedAt?: number;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);

  const errorCount = useMemo(
    () => (reqs ?? []).filter(isNetError).length,
    [reqs],
  );

  const visible = useMemo(() => {
    const all = reqs ?? [];
    if (filter === 'all') return all;
    if (filter === 'errors') return all.filter(isNetError);
    return all.filter((r) => categoryOf(r) === filter);
  }, [reqs, filter]);

  if (!reqs || reqs.length === 0)
    return (
      <div className="text-sm text-disabled-text text-center py-8 border rounded-lg">
        {t('No network activity captured for this run.')}
      </div>
    );

  const cur = selected != null ? reqs[selected] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* type filter chips (no legend, no waterfall — per review) */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const isErr = f.key === 'errors';
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium rounded-full px-2.5 py-1 border transition ${
                active ? '' : 'bg-white text-gray-dark hover:bg-gray-lightest'
              }`}
              style={
                active
                  ? {
                      background: 'var(--color-active-blue)',
                      borderColor: 'var(--color-teal)',
                      color: 'var(--color-teal)',
                    }
                  : { borderColor: 'var(--color-gray-light)' }
              }
            >
              {f.label}
              {isErr && errorCount > 0 && (
                <span className={active ? '' : 'text-red'}>
                  {' '}
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* request list */}
      <div className="border rounded-lg overflow-hidden text-xs">
        <div
          className={`${NET_GRID} px-3 py-1.5 bg-gray-lightest border-b text-disabled-text font-medium uppercase tracking-wide`}
        >
          <span>{t('Status')}</span>
          <span>{t('Method')}</span>
          <span>{t('Request')}</span>
          <span className="text-right">{t('Size')}</span>
          <span className="text-right">{t('Time')}</span>
        </div>
        {visible.length === 0 ? (
          <div className="px-3 py-6 text-center text-disabled-text">
            {t('No requests match this filter.')}
          </div>
        ) : (
          visible.map((r) => {
            const idx = reqs.indexOf(r);
            const errored = isNetError(r);
            const isSel = idx === selected;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelected(isSel ? null : idx)}
                className={`${NET_GRID} w-full text-left px-3 py-1.5 border-b last:border-b-0 transition ${
                  isSel ? 'bg-active-blue' : 'hover:bg-gray-lightest'
                }`}
              >
                <span
                  className="font-medium"
                  style={{ color: statusColor(r.status) }}
                >
                  {r.status === 0 ? t('ERR') : r.status}
                </span>
                <span className="text-disabled-text">{r.method}</span>
                <span className="min-w-0 truncate">
                  <span className="text-disabled-text">{hostOf(r.url)}</span>
                  <span className="text-gray-darkest"> {pathOf(r.url)}</span>
                </span>
                <span className="text-right text-disabled-text">
                  {fmtBytes(r.size)}
                </span>
                <span className="text-right text-disabled-text">
                  {r.duration ? `${Math.round(r.duration)}ms` : '—'}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* detail for the selected request */}
      {cur && (
        <Detail
          req={cur}
          startedAt={startedAt}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default NetworkPanel;
