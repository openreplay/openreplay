import { CopyButton } from '@/ui/actions/CopyButton';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import type { MenuItem } from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import {
  type KeyValueGroup,
  type KeyValueItem,
  KeyValueList,
} from '@/ui/data/KeyValueList';
import { JsonTree } from '@/ui/data/json-tree';
import { SearchField } from '@/ui/inputs/SearchField';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { EntityDrawer, Section } from '@/ui/overlays/EntityDrawer';
import {
  ChevronDown,
  ChevronUp,
  CircleMinus,
  Columns3,
  Copy,
  ListFilter,
  PlayCircle,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type OtelLog, otelLogTimeMs } from 'App/services/OtelLogsService';

import {
  type LineField,
  byteSize,
  levelLabel,
  levelOf,
  lineFields,
  lineStamp,
  otelRow,
  sessionOf,
} from './logs-logic';

export type RelatedMatch = 'service' | 'pod' | 'all';
const RELATED_SPANS = [1_000, 5_000, 30_000, 60_000];
const DEFAULT_RELATED_SPAN = 5_000;
const RELATED_SIDE = 150;

export interface LogDrawerProps {
  line: OtelLog | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  related: (
    line: OtelLog,
    at: number,
    span: number,
    match: RelatedMatch,
    signal: AbortSignal,
  ) => Promise<OtelLog[]>;
  onOpen: (line: OtelLog) => void;
  termState: (key: string, value: string) => 'in' | 'out' | undefined;
  onTerm: (
    key: string,
    value: string,
    operator: 'is' | 'isNot',
    on: boolean,
  ) => void;
  columns: readonly string[];
  onToggleColumn: (key: string) => void;
  onPlay?: (line: OtelLog) => void;
  withDate: boolean;
}

type Tab = 'attributes' | 'raw' | 'related';

const levelTone = (l: string) =>
  l === 'error' ? 'danger' : l === 'warn' ? 'warning' : 'neutral';
const spanLabel = (ms: number) =>
  ms < 60_000 ? `±${ms / 1000}s` : `±${ms / 60_000}m`;

export function LogDrawer({
  line,
  onClose,
  onPrev,
  onNext,
  related,
  onOpen,
  termState,
  onTerm,
  columns,
  onToggleColumn,
  onPlay,
  withDate,
}: LogDrawerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('attributes');
  const [attrQuery, setAttrQuery] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [span, setSpan] = useState(DEFAULT_RELATED_SPAN);
  const [match, setMatch] = useState<RelatedMatch>('service');
  const session = line ? sessionOf(line) : undefined;

  useEffect(() => {
    if (!line) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLElement &&
        (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) ||
          e.target.closest('[role="menu"]'))
      )
        return;
      if (e.key === 'j' || e.key === 'ArrowDown') onNext?.();
      else if (e.key === 'k' || e.key === 'ArrowUp') onPrev?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [line, onNext, onPrev]);

  const item = (f: LineField): KeyValueItem => {
    const state = f.key ? termState(f.key, f.value) : undefined;
    const menu: MenuItem[] = [];
    if (f.key && !f.multiline) {
      const k = f.key;
      const pair = `${f.name}: ${f.value}`;
      menu.push(
        state === 'in'
          ? {
              key: 'in',
              icon: <ListFilter size={14} />,
              label: t('Remove filter'),
              onClick: () => onTerm(k, f.value, 'is', false),
            }
          : {
              key: 'in',
              icon: <ListFilter size={14} />,
              label: (
                <span className="m-logs__menu-pair">
                  {t('Filter by')} <b>{pair}</b>
                </span>
              ),
              onClick: () => onTerm(k, f.value, 'is', true),
            },
        state === 'out'
          ? {
              key: 'out',
              icon: <CircleMinus size={14} />,
              label: t('Stop excluding'),
              onClick: () => onTerm(k, f.value, 'isNot', false),
            }
          : {
              key: 'out',
              icon: <CircleMinus size={14} />,
              label: (
                <span className="m-logs__menu-pair">
                  {t('Exclude')} <b>{pair}</b>
                </span>
              ),
              onClick: () => onTerm(k, f.value, 'isNot', true),
            },
        { key: 'd', type: 'divider' },
      );
    }
    menu.push({
      key: 'copy',
      icon: <Copy size={14} />,
      label: t('Copy value'),
      onClick: () =>
        void navigator.clipboard?.writeText(f.value).catch(() => undefined),
    });
    if (f.key && !f.multiline) {
      const k = f.key;
      menu.push({
        key: 'col',
        icon: <Columns3 size={14} />,
        label: columns.includes(k) ? t('Remove column') : t('Add column'),
        onClick: () => onToggleColumn(k),
      });
    }
    return {
      key: f.name,
      value: f.value,
      tone: f.tone,
      block: f.multiline,
      state,
      menu: f.multiline ? undefined : menu,
    };
  };

  const groups: KeyValueGroup[] = line
    ? (() => {
        const { log, resource, scope } = lineFields(line);
        return [
          { id: 'log', title: t('Log attributes'), items: log.map(item) },
          {
            id: 'resource',
            title: t('Resource attributes'),
            items: resource.map(item),
          },
          {
            id: 'scope',
            title: t('Scope'),
            items: scope.map(item),
            folded: true,
          },
        ];
      })()
    : [];

  const raw = useMemo(() => (line ? otelRow(line) : null), [line]);
  const level = line ? levelOf(line) : 'info';

  return (
    <EntityDrawer
      open={line != null}
      onClose={onClose}
      size="wide"
      eyebrow={t('Log line')}
      title={line?.serviceName ?? ''}
      meta={
        line && (
          <>
            <Chip tone={levelTone(level)} kind="status">
              {line.severityText || levelLabel(t, level)}
            </Chip>
            <span className="m-logs__stamp">
              {lineStamp(otelLogTimeMs(line), true)}
            </span>
            {line.traceId && (
              <span className="m-logs__trace">
                {t('Trace')}{' '}
                <code title={line.traceId}>{line.traceId.slice(0, 8)}</code>
                <CopyButton
                  variant="ghost"
                  size="xs"
                  text={line.traceId}
                  label={t('Copy the trace id')}
                />
              </span>
            )}
          </>
        )
      }
      headerActions={
        <>
          <IconButton
            icon={<ChevronUp size={15} />}
            label={t('Previous line (k)')}
            variant="ghost"
            disabled={!onPrev}
            onClick={onPrev}
          />
          <IconButton
            icon={<ChevronDown size={15} />}
            label={t('Next line (j)')}
            variant="ghost"
            disabled={!onNext}
            onClick={onNext}
          />
        </>
      }
    >
      {line && (
        <>
          <Section
            title={
              <>
                {t('Message')}{' '}
                <span className="m-dsec__count">
                  {t('{{n}} bytes', { n: byteSize(line.body) })}
                </span>
              </>
            }
            action={
              <CopyButton
                variant="ghost"
                size="xs"
                text={line.body}
                label={t('Copy the message')}
              />
            }
          >
            <pre className="m-logs__text">{line.body}</pre>
          </Section>

          {session && (
            <Section title={t('Session')}>
              <div className="m-logs__session">
                <div className="m-logs__session-lead">
                  <span className="m-logs__session-who">
                    {t('Recording {{id}}', { id: session })}
                  </span>
                  <span className="m-logs__session-what">
                    {t('The session this line was written in')}
                  </span>
                </div>
                {onPlay && (
                  <Button variant="secondary" onClick={() => onPlay(line)}>
                    <PlayCircle size={14} />
                    {t('Watch session')}
                  </Button>
                )}
              </div>
            </Section>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="m-logs__tabs"
          >
            <TabsList className="m-logs__tablist">
              <TabsTrigger value="attributes">{t('Attributes')}</TabsTrigger>
              <TabsTrigger value="raw">{t('Raw')}</TabsTrigger>
              <TabsTrigger value="related">{t('Related logs')}</TabsTrigger>
            </TabsList>
            <TabsContent value="attributes" className="m-logs__pane">
              <KeyValueList
                groups={groups}
                query={attrQuery}
                onQuery={setAttrQuery}
              />
            </TabsContent>
            <TabsContent value="raw" className="m-logs__pane">
              <div className="m-logs__rawbar">
                <SearchField
                  size="sm"
                  placeholder={t('Search keys and values')}
                  value={rawQuery}
                  onChange={setRawQuery}
                />
                {raw && (
                  <CopyButton
                    variant="ghost"
                    size="sm"
                    text={JSON.stringify(raw, null, 2)}
                    label={t('Copy JSON')}
                  />
                )}
              </div>
              {raw && <JsonTree value={raw} query={rawQuery} copyable />}
            </TabsContent>
            <TabsContent value="related" className="m-logs__pane">
              {tab === 'related' && (
                <Related
                  line={line}
                  fetch={related}
                  span={span}
                  onSpan={setSpan}
                  match={match}
                  onMatch={setMatch}
                  onOpen={onOpen}
                  withDate={withDate}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </EntityDrawer>
  );
}

function Related({
  line,
  fetch,
  span,
  onSpan,
  match,
  onMatch,
  onOpen,
  withDate,
}: {
  line: OtelLog;
  fetch: LogDrawerProps['related'];
  span: number;
  onSpan: (ms: number) => void;
  match: RelatedMatch;
  onMatch: (m: RelatedMatch) => void;
  onOpen: (line: OtelLog) => void;
  withDate: boolean;
}) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<OtelLog[] | null>(null);
  const at = otelLogTimeMs(line);
  useEffect(() => {
    const ctl = new AbortController();
    setLines(null);
    fetch(line, at, span, match, ctl.signal)
      .then((found) => {
        if (ctl.signal.aborted) return;
        // the API lists newest first: read them in order, around this one
        const ordered = [...found].sort((a, b) =>
          a.timestamp.length !== b.timestamp.length
            ? a.timestamp.length - b.timestamp.length
            : a.timestamp < b.timestamp
              ? -1
              : 1,
        );
        if (!ordered.some((l) => l.id === line.id)) ordered.push(line);
        const i = ordered.findIndex((l) => l.id === line.id);
        setLines(
          ordered.slice(Math.max(0, i - RELATED_SIDE), i + RELATED_SIDE + 1),
        );
      })
      .catch(() => !ctl.signal.aborted && setLines([line]));
    return () => ctl.abort();
  }, [line.id, span, match]);

  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    const row = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !row) return;
    el.scrollTop = row.offsetTop - el.clientHeight / 2 + row.offsetHeight / 2;
  }, [lines]);

  const others = lines ? lines.length - 1 : 0;
  return (
    <div className="m-logs__rel">
      <div className="m-logs__relbar">
        <Segmented<RelatedMatch>
          ariaLabel={t('Lines from')}
          value={match}
          onChange={onMatch}
          options={[
            { value: 'service', label: t('Service'), title: line.serviceName },
            {
              value: 'pod',
              label: t('Pod'),
              title: line.resourceAttributes?.['k8s.pod.name'],
            },
            { value: 'all', label: t('All') },
          ]}
        />
        <Segmented
          ariaLabel={t('Window')}
          value={String(span)}
          onChange={(v) => onSpan(Number(v))}
          options={RELATED_SPANS.map((ms) => ({
            value: String(ms),
            label: spanLabel(ms),
          }))}
        />
        <span className="m-logs__relcount">
          {lines == null
            ? t('Loading…')
            : others === 0
              ? t('No other lines')
              : t('{{n}} other lines', { n: others, count: others })}
        </span>
      </div>
      <div ref={box} className="m-logs__ctx m-logs__relbox">
        {(lines ?? []).map((l) => {
          const self = l.id === line.id;
          return (
            <button
              key={l.id}
              type="button"
              className={`m-logs__ctx-row is-${levelOf(l)}${self ? ' is-this' : ''}${match === 'all' ? ' with-service' : ''}`}
              onClick={() => !self && onOpen(l)}
              aria-current={self || undefined}
            >
              <span className="m-logs__stamp">
                {lineStamp(otelLogTimeMs(l), withDate)}
              </span>
              {match === 'all' && (
                <span className="m-logs__relsvc">{l.serviceName}</span>
              )}
              <span className="m-logs__msg">
                <span>{l.body}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
