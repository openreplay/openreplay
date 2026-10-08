import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import '@/ui/data/code-block.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ResourceType } from 'Player';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  X,
} from 'lucide-react';
import { DateTime } from 'luxon';
import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { formatClock } from 'App/player-ui/clock';
import { formatBytes } from 'App/utils';
import { getLocalHourFormat } from 'App/utils/intlUtils';
import 'Components/Session/ReplayScreen/request-sheet.css';

import { AnyResource, toCurl, toFetch } from './utils';

type Headers = Record<string, string>;
interface Part {
  headers: Headers | null;
  body: unknown | null;
}

const FETCH_LIKE = [
  ResourceType.XHR,
  ResourceType.FETCH,
  ResourceType.IOS,
  ResourceType.GRAPHQL,
];

function parsePart(raw?: string): Part {
  if (!raw) return { headers: null, body: null };
  let parsed: { headers?: unknown; body?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { headers: null, body: null };
  }
  const headers =
    parsed.headers &&
    typeof parsed.headers === 'object' &&
    !Array.isArray(parsed.headers)
      ? (parsed.headers as Headers)
      : null;
  let body = parsed.body ?? null;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = body || null;
    }
  }
  return { headers, body };
}

export interface RequestDetailsProps {
  resource: AnyResource & Record<string, any>;
  index?: number;
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onJump?: (time: number) => void;
  onClose: () => void;
  isSpot?: boolean;
}

export function RequestDetails({
  resource: r,
  index = 0,
  total = 0,
  onPrev,
  onNext,
  onJump,
  onClose,
}: RequestDetailsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
  const call = FETCH_LIKE.includes(r.type as ResourceType);
  const [tab, setTab] = useState(call ? 'headers' : 'timings');
  useEffect(() => setTab(call ? 'headers' : 'timings'), [r, call]);
  const req = useMemo(() => parsePart(r.request), [r]);
  const res = useMemo(() => parsePart(r.response), [r]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (kind: 'curl' | 'fetch') => {
    const text = kind === 'curl' ? toCurl(r) : toFetch(r);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        kind === 'curl' ? t('Copied as cURL') : t('Copied as JS fetch'),
      );
    } catch {
      toast.info(t('Could not reach the clipboard'));
    }
  };

  const size = r.decodedBodySize || r.responseBodySize;
  const duration = parseInt(String(r.duration ?? ''), 10);
  const date = r.timestamp
    ? DateTime.fromMillis(r.timestamp)
        .setZone(timezone.value)
        .toFormat(`LLL dd, yyyy, ${getLocalHourFormat()}`)
    : null;

  return (
    <>
      <header className="m-rq__head">
        <h2 className="m-rq__title">{t('Network Request')}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="subtle" size="sm" className="m-rq__copyas">
              {t('Copy as')}
              <ChevronDown size={13} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-0">
            <DropdownMenuItem onSelect={() => void copy('curl')}>
              cURL
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copy('fetch')}>
              JS fetch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton
          icon={<X size={14} />}
          label={t('Close the request')}
          variant="ghost"
          onClick={onClose}
        />
      </header>

      <div className="m-rq__body">
        <dl className="m-rq__facts">
          <dt>{t('Name')}</dt>
          <dd>
            <span className="m-rq__name m-mono">{r.url}</span>
          </dd>
          {r.method && r.method !== '..' ? (
            <>
              <dt>{t('Request method')}</dt>
              <dd className="m-mono">{r.method}</dd>
            </>
          ) : null}
          {r.status ? (
            <>
              <dt>{t('Status code')}</dt>
              <dd className={`m-mono${r.success === false ? ' is-bad' : ''}`}>
                {r.status}
              </dd>
            </>
          ) : null}
          <dt>{t('Type')}</dt>
          <dd className="m-mono">{r.type}</dd>
          {size ? (
            <>
              <dt>{t('Size')}</dt>
              <dd className="m-mono">{formatBytes(size)}</dd>
            </>
          ) : null}
          {duration ? (
            <>
              <dt>{t('Duration')}</dt>
              <dd className="m-mono">{duration} ms</dd>
            </>
          ) : null}
          {r.time != null ? (
            <>
              <dt>{t('Time')}</dt>
              <dd>
                {onJump ? (
                  <button
                    type="button"
                    className="m-rq__jump m-mono"
                    onClick={() => onJump(r.time)}
                    title={t('Jump to this moment')}
                  >
                    {formatClock(r.time)}
                  </button>
                ) : (
                  <span className="m-mono">{formatClock(r.time)}</span>
                )}
                {date ? <span className="m-rq__date"> · {date}</span> : null}
              </dd>
            </>
          ) : null}
        </dl>

        <Tabs value={tab} onValueChange={setTab} className="m-rq__tabs">
          <TabsList aria-label={t('Request detail')}>
            {call && <TabsTrigger value="headers">{t('Headers')}</TabsTrigger>}
            {call && <TabsTrigger value="request">{t('Request')}</TabsTrigger>}
            {call && (
              <TabsTrigger value="response">{t('Response')}</TabsTrigger>
            )}
            <TabsTrigger value="timings">{t('Timings')}</TabsTrigger>
          </TabsList>
          {call && (
            <TabsContent value="headers" className="m-rq__pane">
              <HeaderList title={t('Request headers')} headers={req.headers} />
              <HeaderList title={t('Response headers')} headers={res.headers} />
            </TabsContent>
          )}
          {call && (
            <TabsContent value="request" className="m-rq__pane">
              <Body value={req.body} />
            </TabsContent>
          )}
          {call && (
            <TabsContent value="response" className="m-rq__pane">
              <Body value={res.body} />
            </TabsContent>
          )}
          <TabsContent value="timings" className="m-rq__pane">
            <Timings timings={r.timings} />
          </TabsContent>
        </Tabs>
      </div>

      {total > 1 && (
        <footer className="m-rq__foot">
          <Button
            variant="subtle"
            size="sm"
            onClick={onPrev}
            disabled={!onPrev || index <= 0}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t('Prev')}
          </Button>
          <span className="m-rq__count m-mono">
            {index + 1} / {total}
          </span>
          <Button
            variant="subtle"
            size="sm"
            onClick={onNext}
            disabled={!onNext || index >= total - 1}
          >
            {t('Next')}
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </footer>
      )}
    </>
  );
}

function HeaderList({
  title,
  headers,
}: {
  title: string;
  headers: Headers | null;
}) {
  const { t } = useTranslation();
  const rows = headers ? Object.entries(headers) : [];
  return (
    <section className="m-rq__hgroup">
      <h3 className="m-rq__h">{title}</h3>
      {rows.length === 0 ? (
        <p className="m-rq__empty-line">{t('Headers were not captured.')}</p>
      ) : (
        <dl className="m-rq__hlist">
          {rows.map(([k, v]) => (
            <div key={k} className="m-rq__hrow">
              <dt className="m-mono">{k}:</dt>
              <dd className="m-mono">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Body({ value }: { value: unknown | null }) {
  const { t } = useTranslation();
  if (value == null) {
    return (
      <p className="m-rq__empty">
        {t('Body is empty or not captured.')}{' '}
        <a
          className="m-rq__link"
          href="https://docs.openreplay.com/en/sdk/network-options"
          target="_blank"
          rel="noreferrer"
        >
          {t('Learn how to get more out of Fetch/XHR requests.')}
        </a>
      </p>
    );
  }
  if (typeof value !== 'object') {
    return <pre className="m-rq__json m-mono m-rq__raw">{String(value)}</pre>;
  }
  return (
    <div className="m-rq__json m-mono" role="tree">
      <JsonNode value={value} depth={0} last />
    </div>
  );
}

function JsonNode({
  name,
  value,
  depth,
  last,
}: {
  name?: string;
  value: unknown;
  depth: number;
  last: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(depth < 2);
  const comma = last ? '' : ',';
  const key =
    name != null ? (
      <>
        <span className="m-rq__key">{name}</span>
        <span className="m-code__t-punct">: </span>
      </>
    ) : null;

  if (value != null && typeof value === 'object') {
    const isArr = Array.isArray(value);
    const entries = isArr
      ? (value as unknown[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);
    const [o, c] = isArr ? ['[', ']'] : ['{', '}'];
    return (
      <div className="m-rq__node" role="treeitem" aria-expanded={open}>
        <button
          type="button"
          className="m-rq__fold"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t('Collapse') : t('Expand')}
        >
          {key}
          <span className="m-code__t-punct">{o}</span>
          {!open && <span className="m-rq__ellip">{entries.length}</span>}
          {!open && (
            <span className="m-code__t-punct">
              {c}
              {comma}
            </span>
          )}
          <span className="m-rq__caret" aria-hidden="true">
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        </button>
        {open && (
          <div className="m-rq__children" role="group">
            {entries.map(([k, v], i) => (
              <JsonNode
                key={k}
                name={isArr ? undefined : k}
                value={v}
                depth={depth + 1}
                last={i === entries.length - 1}
              />
            ))}
            <div>
              <span className="m-code__t-punct">
                {c}
                {comma}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  let tok: ReactNode;
  if (typeof value === 'string')
    tok = <span className="m-code__t-string">"{value}"</span>;
  else if (typeof value === 'number')
    tok = <span className="m-code__t-number">{value}</span>;
  else tok = <span className="m-code__t-keyword">{String(value)}</span>;
  return (
    <div className="m-rq__leaf" role="treeitem">
      {key}
      {tok}
      <span className="m-code__t-punct">{comma}</span>
    </div>
  );
}

const PHASES = [
  {
    category: 'Resource Scheduling',
    children: [
      {
        key: 'queueing',
        name: 'Queueing',
        description: 'Time spent in browser queue before connection start',
      },
    ],
  },
  {
    category: 'Connection Start',
    children: [
      {
        key: 'stalled',
        name: 'Stalled',
        description: 'Time request was stalled after connection start',
      },
      {
        key: 'dnsLookup',
        name: 'DNS Lookup',
        description: 'Time spent resolving the DNS',
      },
      {
        key: 'initialConnection',
        name: 'Initial Connection',
        description: 'Time establishing connection (TCP handshakes/retries)',
      },
      {
        key: 'ssl',
        name: 'SSL',
        description: 'Time spent completing SSL/TLS handshake',
      },
    ],
  },
  {
    category: 'Request/Response',
    children: [
      {
        key: 'ttfb',
        name: 'Request & TTFB',
        description: 'Time waiting for first byte (server response time)',
      },
      {
        key: 'contentDownload',
        name: 'Content Download',
        description: 'Time spent receiving the response data',
      },
    ],
  },
] as const;

const ms = (v: number) =>
  v < 1 && v > 0 ? `${Math.round(v * 1000)} μs` : `${Math.round(v)} ms`;

function Timings({ timings }: { timings?: Record<string, number> }) {
  const { t } = useTranslation();
  const values = timings ?? {};
  const parts = Object.entries(values).filter(([k]) => k !== 'total');
  if (!timings || parts.every(([, v]) => !v)) {
    return (
      <p className="m-rq__empty">
        {t('Request was instant (cached) or no timings were recorded.')}{' '}
        <a
          className="m-rq__link"
          href="https://docs.openreplay.com/en/troubleshooting/network-resources/"
          target="_blank"
          rel="noreferrer"
        >
          {t('Learn how to get more out of Fetch/XHR requests.')}
        </a>
      </p>
    );
  }
  const sum = parts.reduce((n, [, v]) => n + (v || 0), 0);
  const total = Math.max(values.total || 0, sum, 1);
  const adjusted = values.total !== undefined && total !== values.total;
  let cursor = 0;
  return (
    <div className="m-rq__timings">
      {PHASES.map((g) => (
        <section key={g.category} className="m-rq__tgroup">
          <h3 className="m-rq__h">{t(g.category)}</h3>
          {g.children.map((ph) => {
            const v = values[ph.key] || 0;
            const left = (cursor / total) * 100;
            const width = (v / total) * 100;
            cursor += v;
            return (
              <div key={ph.key} className="m-rq__trow">
                <Tooltip title={t(ph.description)}>
                  <span className="m-rq__tname">
                    <HelpCircle size={12} aria-hidden="true" />
                    {t(ph.name)}
                  </span>
                </Tooltip>
                <span className="m-rq__ttrack" aria-hidden="true">
                  {v > 0 && (
                    <i
                      className={`m-rq__tbar is-${ph.key}`}
                      style={{ left: `${left}%`, width: `max(2px, ${width}%)` }}
                    />
                  )}
                </span>
                <span className="m-rq__tms m-mono">{ms(v)}</span>
              </div>
            );
          })}
        </section>
      ))}
      <p className="m-rq__total">
        <span>{t('Total')}</span>
        <b className="m-mono">{ms(total)}</b>
      </p>
      {adjusted ? (
        <p className="m-rq__adjusted">
          {t('Adjusted from the reported value of {{v}}', {
            v: ms(values.total),
          })}
        </p>
      ) : null}
    </div>
  );
}
