import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell } from '@/ui/filters/DisplayMenu';
import { RefreshControl } from '@/ui/filters/RefreshControl';
import { SegmentIndicator } from '@/ui/filters/SegmentIndicator';
import { DateRange } from '@/ui/inputs/DateRange';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ListFooter } from '@/ui/layout/ListFooter';
import { NewRowsBand } from '@/ui/layout/NewRowsBand';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { PaneHandle } from '@/ui/layout/PaneHandle';
import {
  getRowsPerPage,
  setRowsPerPage,
  useRowsChoice,
} from '@/ui/layout/rows-per-page';
import { useViewport } from '@/ui/layout/use-viewport';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Bookmark, PanelLeftOpen } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CUSTOM_RANGE } from 'App/dateRange';
import { useStore } from 'App/mstore';
import { PIN_LEAD } from 'App/mstore/sessionStore';
import {
  CLIENT_TABS,
  client,
  logs as logsRoute,
  session as sessionRoute,
  withSiteId,
} from 'App/routes';
import { useNavigate } from 'App/routing';
import { type OtelLog, otelLogTimeMs } from 'App/services/OtelLogsService';

import {
  EntryField,
  FilterBar,
  buildFilterEditor,
  describeRules,
} from 'Shared/FilterEditor';
import { ValueSourceContext } from 'Shared/FilterEditor/data';
import { logsTarget } from 'Shared/FilterEditor/targets';
import type { CatalogueEntry } from 'Shared/FilterEditor/types';

import { FacetRail } from './FacetRail';
import { LogDrawer } from './LogDrawer';
import { LogDrilldown } from './LogDrilldown';
import { LogHistogram } from './LogHistogram';
import { LogTable } from './LogTable';
import { ExportControl, SaveViewDialog } from './LogsToolbar';
import {
  DEFAULT_LOG_PRESET,
  EXPORT_LIMIT,
  LOG_PRESETS,
  type LogLevel,
  VIEW_CATEGORY,
  catalogue,
  clampWindow,
  clockLabel,
  compactCount,
  drillCards,
  facetChoices,
  isInternal,
  keyLabel,
  keyOf,
  levelLabel,
  levelOf,
  levelOfText,
  levelTotals,
  logFilter,
  nameOfKey,
  scopeOfKey,
  sessionOf,
  toBuckets,
  valueLabel,
  windowBounds,
} from './logs-logic';
import './logs.css';

const DAY = 86_400_000;
const REFRESH_CHOICES = [5, 10, 30, 60];
const DEFAULT_FACETS = [
  'service',
  'res.deployment.environment.name',
  'res.k8s.namespace.name',
  'res.k8s.pod.name',
];

function LogsPage() {
  const { t } = useTranslation();
  const {
    otelLogsStore: store,
    projectsStore,
    userStore,
    sessionStore,
  } = useStore();
  const navigate = useNavigate();
  const phone = useViewport() === 'phone';
  const siteId = projectsStore.siteId;
  const userId = userStore.account.id;
  const rowsChoice = useRowsChoice();
  const [legendSlot, setLegendSlot] = useState<HTMLElement | null>(null);
  const [railDragging, setRailDragging] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  store.labelOf = (k) => keyLabel(t, k);

  useEffect(() => {
    if (siteId && userId != null) store.loadViews(userId, siteId);
  }, [siteId, userId]);

  // a rule typed into the bar settles before it asks
  useEffect(() => {
    if (!siteId) return undefined;
    const id = window.setTimeout(() => void store.run(), 250);
    return () => window.clearTimeout(id);
  }, [store.signature, siteId]);

  // a new Fit count waits for the next search: the bar's height (a filter,
  // the legend wrapping) never moves the lines under the page numbers
  useEffect(() => {
    store.resize(getRowsPerPage('logs'));
  }, [rowsChoice]);

  const relative = 'preset' in store.window;
  useEffect(() => {
    if (!relative || store.refreshEvery == null || store.paused)
      return undefined;
    const id = window.setInterval(() => {
      if (!document.hidden) store.tick();
    }, store.refreshEvery * 1000);
    const onVisible = () => {
      if (!document.hidden) store.tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [relative, store.refreshEvery, store.paused]);

  // the column head and the new-lines band stick under the bar, one or two rows
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    const host = el?.parentElement;
    if (!el || !host) return undefined;
    const publish = () =>
      host.style.setProperty('--m-logs-bar-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setViewOpen(false), [store.viewId]);

  const applied = store.appliedFilter;
  const bounds = applied
    ? { from: applied.startTime, to: applied.endTime }
    : windowBounds(store.window);
  const withDate =
    bounds.to - bounds.from > DAY ||
    new Date(bounds.from).getDate() !== new Date(bounds.to).getDate();

  const resourceKeys = useMemo(
    () =>
      new Set(
        (store.facets?.attributeKeys?.resource ?? []).map(
          (k) => `res.${k.key}`,
        ),
      ),
    [store.facets],
  );
  const facetKeys =
    store.facetKeys ??
    DEFAULT_FACETS.filter((k) => k === 'service' || resourceKeys.has(k));
  useEffect(() => {
    if (store.facets) store.loadFacetValues(facetKeys);
  }, [store.facets, facetKeys.join('|')]);

  const entries = useMemo(() => catalogue(t, store.facets), [store.facets, t]);
  const viewEntries: CatalogueEntry[] = store.views.map((v) => ({
    id: `logview.${v.id}`,
    name: v.id,
    displayName: v.name,
    category: VIEW_CATEGORY,
    isEvent: false,
    dataType: 'string',
    hasProperties: false,
    autoCaptured: false,
    source: logFilter('message', v.name),
  }));
  const editor = buildFilterEditor(logsTarget(store));
  const ruleCount = store.rules.length;
  const sentence = (props = editor.properties) =>
    describeRules(t, [], props, 'and');

  const valueSource = useMemo(
    () => ({
      options: async (
        filter: { entry: CatalogueEntry },
        _q: string,
        signal: AbortSignal,
      ) => {
        const key = filter.entry.name;
        if (key === 'message') return [];
        let values: { value: string; count: number }[];
        if (key === 'service' || key === 'level')
          values = store.facetValuesOf(key).values;
        else {
          const scope = scopeOfKey(key) === 'log' ? 'log' : 'resource';
          values = (await store.fetchFacetValues(scope, nameOfKey(key), signal))
            .values;
        }
        const top = values.reduce((m, v) => Math.max(m, v.count), 0);
        return values.map((v) => ({
          value: v.value,
          label: valueLabel(t, key, v.value),
          share: top ? v.count / top : undefined,
        }));
      },
      shareLabel: (pct: number) => t('{{pct}}% of the top value', { pct }),
    }),
    [store, t],
  );

  /* the histogram and its legend */
  const { buckets, step } = toBuckets(store.histogram, bounds.from, bounds.to);
  const counts = levelTotals(buckets);
  const levelValues = store.valuesOn('level');
  const levelsOn = [...new Set(levelValues.map(levelOfText))];
  const rawOf = (l: LogLevel) => {
    const raw = store
      .facetValuesOf('level')
      .values.map((v) => v.value)
      .filter((v) => levelOfText(v) === l);
    return raw.length ? raw : [l];
  };
  const toggleLevel = (l: LogLevel) => {
    const raw = rawOf(l);
    const on = levelsOn.includes(l);
    store.setValues(
      'level',
      on
        ? levelValues.filter((v) => levelOfText(v) !== l)
        : [...new Set([...levelValues, ...raw])],
    );
  };
  const presetLabel = (preset: string) =>
    t(LOG_PRESETS.find((p) => p.value === preset)?.label ?? preset);
  const zoomBack = store.zoomBack;
  const backLabel = zoomBack
    ? 'preset' in zoomBack
      ? presetLabel(zoomBack.preset).toLowerCase()
      : `${clockLabel(zoomBack.from, withDate)} – ${clockLabel(zoomBack.to, withDate)}`
    : '';

  /* the controls on the list's head */
  const w = store.window;
  const fixedRange = t(
    "Auto-refresh works on relative windows, like Past hour. A custom range doesn't move.",
  );
  const windowControl = (
    <Tooltip title={fixedRange} disabled={relative}>
      <span className="inline-flex">
        <DateRange
          field={t('Time')}
          period={
            'preset' in w
              ? { rangeName: w.preset }
              : { rangeName: CUSTOM_RANGE, start: w.from, end: w.to }
          }
          options={LOG_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          resting={DEFAULT_LOG_PRESET}
          withTime
          onChange={(p: any) =>
            p.rangeName === CUSTOM_RANGE
              ? store.setWindow(clampWindow(p.start, p.end))
              : store.setWindow({ preset: p.rangeName })
          }
        />
      </span>
    </Tooltip>
  );
  const baseColumns = [
    'level',
    'service',
    ...[
      'res.deployment.environment.name',
      'res.k8s.namespace.name',
      'res.k8s.pod.name',
    ].filter((k) => resourceKeys.has(k)),
    'trace',
    'session',
  ];
  const added = store.columns.filter((c) => !baseColumns.includes(c));
  const more = (['log', 'resource'] as const).flatMap((scope) =>
    (store.facets?.attributeKeys?.[scope] ?? [])
      .filter((k) => !isInternal(k.key))
      .map((k) => {
        const key = keyOf(scope, k.key);
        return {
          value: key,
          label: keyLabel(t, key),
          hint: k.key,
          group:
            scope === 'log' ? t('Log attributes') : t('Resource attributes'),
        };
      })
      .filter((c) => !baseColumns.includes(c.value)),
  );
  const displayControl = (
    <DisplayShell
      rows={[]}
      fields={[...baseColumns, ...added].map((c) => ({
        value: c,
        label: keyLabel(t, c),
        on: store.columns.includes(c),
      }))}
      onToggleField={store.toggleColumn}
      moreFields={more}
      changeCount={store.columns.length}
      onReset={store.resetColumns}
    />
  );

  const play = (l: OtelLog) => {
    const id = sessionOf(l);
    if (!id) return;
    const at = otelLogTimeMs(l);
    const level = levelOf(l);
    sessionStore.setReplayPin({
      sessionId: id,
      at,
      kind: 'log',
      label: l.body,
      detail: [l.serviceName, l.severityText || levelLabel(t, level)]
        .filter(Boolean)
        .join(' · '),
      tone:
        level === 'error' ? 'danger' : level === 'warn' ? 'warning' : undefined,
      backUrl: withSiteId(logsRoute(), siteId),
    });
    // Open in Logs lands on this drawer even after newer lines push it out
    store.openLog(l, true);
    navigate(
      `${withSiteId(sessionRoute(id), siteId)}?jumpto=${Math.max(0, at - PIN_LEAD)}`,
    );
  };

  const filters = store.rules.length > 0 && (
    <FilterBar
      editor={editor}
      entries={entries}
      variant={store.view ? 'panel' : 'page'}
      lead={t('Add filter')}
      ariaLabel={t('Log filter')}
      restCollapsed={store.view ? false : store.restCollapsed}
      saveAction={
        store.view ? undefined : (
          <Tooltip
            title={t(
              'Save these filters as a view. The time window is not part of it.',
            )}
          >
            <span>
              <Button className="m-fbar__save" onClick={() => setNaming(true)}>
                {t('Save as view')}
              </Button>
            </span>
          </Tooltip>
        )
      }
    />
  );

  /* a part with no answer shows no figure */
  const status = store.loading
    ? 'loading'
    : store.logs.length > 0
      ? 'ready'
      : store.searchFailed
        ? 'error'
        : store.neverSent
          ? 'first'
          : 'ready';
  const failed = (onRetry: () => void) => (
    <EmptyState
      state="logs-error"
      title={t("The logs didn't load")}
      hint={t(
        "The logs service didn't answer. Try again, or narrow the window.",
      )}
      action={<Button onClick={onRetry}>{t('Try again')}</Button>}
    />
  );
  const span =
    'preset' in w
      ? (LOG_PRESETS.find((p) => p.value === w.preset)?.minutes ?? 0)
      : 0;
  const widen = LOG_PRESETS.find(
    (p) => p.minutes >= 24 * 60 && p.minutes > span,
  );
  const empty =
    status === 'error' ? (
      failed(() => void store.run())
    ) : status === 'first' ? (
      <EmptyState
        state="logs-first"
        title={t('No logs yet')}
        hint={t(
          "Logs arrive over OpenTelemetry. Point your services' exporter at this project and lines show here.",
        )}
        action={
          <Button
            variant="primary"
            onClick={() => navigate(client(CLIENT_TABS.OPENTELEMETRY))}
          >
            {t('Send logs')}
          </Button>
        }
      />
    ) : ruleCount > 0 ? (
      <EmptyState
        state="logs-nomatch"
        title={t('No lines match')}
        hint={t(
          'Every filter above is doing its job. Loosen one, or widen the window.',
        )}
        action={
          <Button onClick={store.clearRules}>{t('Show every line')}</Button>
        }
      />
    ) : (
      <EmptyState
        state="logs-window"
        title={
          'preset' in w
            ? t('No lines in the {{window}}', {
                window: presetLabel(w.preset).toLowerCase(),
              })
            : t('No lines in this window')
        }
        hint={t('Widen the window, or refresh for new lines.')}
        action={
          widen && (
            <Button onClick={() => store.setWindow({ preset: widen.value })}>
              {presetLabel(widen.value)}
            </Button>
          )
        }
      />
    );

  const chartWait = status === 'loading' || store.histogramLoading;
  const chart =
    status === 'error' || status === 'first' ? null : chartWait ? (
      <div
        className="m-logs__chart m-logs__chart--wait"
        role="status"
        aria-label={t('Loading the chart')}
      >
        <span className="m-logs__chart-wait" />
      </div>
    ) : store.chartFailed ? (
      <div className="m-logs__chart m-logs__chart--fail">
        <span>{t("The chart didn't load. The lines below are complete.")}</span>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => store.retryPart('chart')}
        >
          {t('Try again')}
        </Button>
      </div>
    ) : (
      <LogHistogram
        buckets={buckets}
        step={step}
        levels={levelsOn}
        counts={counts}
        onToggleLevel={toggleLevel}
        onWindow={(from, to) => store.narrowWindow(clampWindow(from, to))}
        back={
          zoomBack ? { label: backLabel, onBack: store.zoomOut } : undefined
        }
        withDate={withDate}
        legendSlot={legendSlot}
      />
    );

  const rail =
    status === 'loading' || store.facetsLoading ? (
      <div className="m-logs__railwait">
        <SkeletonRows rows={7} columns={[70, 18]} />
      </div>
    ) : status === 'error' ? (
      <p className="m-logs__railnote">
        {t('The facets come back with the lines.')}
      </p>
    ) : store.facetsFailed ? (
      <div className="m-logs__railnote">
        <p>{t("The facets didn't load.")}</p>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => store.retryPart('facets')}
        >
          {t('Try again')}
        </Button>
      </div>
    ) : (
      <FacetRail
        facets={facetKeys.map((key) => {
          const { values, loading, failed } = store.facetValuesOf(key);
          const on = store.valuesOn(key);
          // the API matches these values exactly, case included
          const list = values.map((v) => ({
            value: v.value,
            label: valueLabel(t, key, v.value),
            count: v.count,
            on: on.includes(v.value),
          }));
          for (const v of on)
            if (!list.some((x) => x.value === v))
              list.push({
                value: v,
                label: valueLabel(t, key, v),
                count: 0,
                on: true,
              });
          return {
            key,
            label: keyLabel(t, key),
            values: list,
            loading,
            failed,
          };
        })}
        onToggle={(k, v) => store.toggleValue(k, v)}
        onClearFacet={store.clearFacet}
        onHide={() => store.setRail(false)}
        facetKeys={facetKeys}
        onFacetKeys={store.setFacetKeys}
        choices={facetChoices(t, store.facets)}
      />
    );
  const withRail = !phone && status !== 'first';

  return (
    <ValueSourceContext.Provider value={valueSource}>
      <PageCard title={t('Logs')} split>
        {!phone && (
          <EntryField
            taken={[]}
            onPick={(e) =>
              e.category === VIEW_CATEGORY
                ? store.applyView(e.name)
                : editor.onAdd(e)
            }
            hasRules={ruleCount > 0}
            entries={[...viewEntries, ...entries]}
            placeholder={t('Search logs')}
          />
        )}

        {!phone && store.view ? (
          <SegmentIndicator
            kind="view"
            name={store.view.name}
            rules={sentence()}
            icon={<Bookmark size={15} />}
            count={store.total}
            countText={t('{{n}} lines', {
              n: compactCount(store.total),
              count: store.total,
            })}
            edited={store.viewEdited}
            expanded={viewOpen}
            onToggle={() => setViewOpen((o) => !o)}
            onClear={store.clearRules}
            onSaveChanges={store.updateView}
            onDelete={store.deleteView}
          >
            <PagePanel spills>{filters}</PagePanel>
          </SegmentIndicator>
        ) : (
          !phone && filters && <PagePanel spills>{filters}</PagePanel>
        )}

        <PagePanel>
          <div
            className={`m-logs${store.railOpen ? '' : ' m-logs--rail-hidden'}${railDragging ? ' is-resizing' : ''}`}
            style={
              {
                '--m-logs-rail-w': `${store.railWidth}px`,
                '--m-logs-rail-cur':
                  store.railOpen && withRail ? `${store.railWidth}px` : '0px',
              } as CSSProperties
            }
          >
            {!phone && (
              // kept without a rail: it holds the grid's first column
              <div
                className="m-logs__railbox"
                {...(!store.railOpen || !withRail
                  ? { inert: true, 'aria-hidden': true }
                  : {})}
              >
                <div className="m-logs__railfill">{withRail && rail}</div>
              </div>
            )}
            {withRail && (
              <PaneHandle
                className="m-logs__handle"
                open={store.railOpen}
                width={store.railWidth}
                min={180}
                max={420}
                closeBelow={120}
                onWidth={store.setRailWidth}
                onOpen={store.setRail}
                onDragging={setRailDragging}
                name={t('the facets')}
              />
            )}
            <div className="m-logs__main">
              {withRail && !store.railOpen && (
                <div className="m-logs__edge">
                  <span className="m-logs__edge-show">
                    <IconButton
                      icon={<PanelLeftOpen size={14} />}
                      label={t('Show the facets')}
                      variant="ghost"
                      size="xs"
                      onClick={() => store.setRail(true)}
                    />
                  </span>
                </div>
              )}
              <div className="m-logs__bar" ref={bar}>
                <span className="m-logs__bar-legend" ref={setLegendSlot} />
                <span className="m-logs__headend">
                  <Segmented
                    ariaLabel={t('Display as')}
                    value={store.display}
                    onChange={(v) => store.setDisplay(v as 'data' | 'drill')}
                    options={[
                      {
                        value: 'data',
                        label: t('Data'),
                        title: t('Every line, newest first'),
                      },
                      {
                        value: 'drill',
                        label: t('Drilldown'),
                        title: t(
                          'Every attribute of these lines, as how its values split',
                        ),
                      },
                    ]}
                  />
                  {windowControl}
                  <RefreshControl
                    every={store.refreshEvery}
                    paused={store.paused}
                    choices={REFRESH_CHOICES}
                    onEvery={store.setRefresh}
                    onPause={store.setPaused}
                    onRefresh={() => void store.run()}
                    unavailable={relative ? undefined : fixedRange}
                  />
                  <ExportControl
                    total={store.total}
                    loaded={store.logs.length}
                    collect={store.collectExport}
                    from={bounds.from}
                    to={bounds.to}
                    columns={store.columns}
                    ruleCount={ruleCount}
                  />
                  {displayControl}
                </span>
              </div>
              {chart}
              <NewRowsBand
                count={store.newCount}
                label={t('Show {{n}} new lines', {
                  n: compactCount(store.newCount),
                  count: store.newCount,
                })}
                stickyTop="var(--m-logs-bar-h, 3rem)"
                onShow={store.showNew}
              />
              {status === 'loading' ? (
                <SkeletonRows rows={8} />
              ) : store.logs.length === 0 ? (
                empty
              ) : store.display === 'drill' ? (
                <LogDrilldown
                  cards={drillCards(store.facets, store.total)}
                  total={store.total}
                  valuesOf={store.facetValuesOf}
                  onShown={store.loadFacetValues}
                  epoch={store.fetchSeq}
                  termState={store.termState}
                  onTerm={store.setTerm}
                  rules={store.ruleList}
                />
              ) : (
                <>
                  {(store.pageError || store.searchFailed) &&
                  store.pageRows.length === 0 ? (
                    // a failed search has no page to ask again: search anew
                    failed(
                      store.searchFailed
                        ? () => void store.run()
                        : store.retryPage,
                    )
                  ) : store.pageLoading ? (
                    <SkeletonRows rows={Math.min(store.pageSize, 12)} />
                  ) : (
                    <LogTable
                      rows={store.pageRows}
                      withDate={withDate}
                      openId={store.openId}
                      onOpen={store.openLog}
                      onPlay={play}
                      columns={store.columns}
                    />
                  )}
                  <ListFooter
                    fit="logs"
                    page={store.page}
                    pageSize={store.pageSize}
                    total={store.pagerTotal}
                    noun={(count, n) =>
                      store.capped
                        ? t('the newest {{n}} · {{total}} in this window', {
                            n,
                            total: store.total.toLocaleString(),
                          })
                        : t('{{n}} lines', {
                            count,
                            // no histogram counted them: as many as loaded, and more
                            n: store.totalKnown
                              ? n
                              : `${store.logs.length.toLocaleString()}+`,
                          })
                    }
                    hint={
                      store.capped
                        ? t(
                            'The newest {{n}} of {{total}}; narrow the window for the rest.',
                            {
                              n: compactCount(EXPORT_LIMIT),
                              total: compactCount(store.total),
                            },
                          )
                        : undefined
                    }
                    onPage={store.setPage}
                    onPageSize={(n) => setRowsPerPage(n)}
                  />
                </>
              )}
            </div>
          </div>
        </PagePanel>
      </PageCard>
      <LogDrawer
        line={store.openLine}
        onClose={() => store.open(null)}
        onPrev={store.openIndex > 0 ? () => void store.step(-1) : undefined}
        onNext={
          store.openIndex >= 0 &&
          (store.openIndex < store.logs.length - 1 || store.nextCursor)
            ? () => void store.step(1)
            : undefined
        }
        related={store.related}
        onOpen={store.openLog}
        termState={store.termState}
        // the answer is the list; undoing a filter keeps the line open
        onTerm={(key, value, operator, on) => {
          store.setTerm(key, value, operator, on);
          if (on) store.open(null);
        }}
        columns={store.columns}
        onToggleColumn={store.toggleColumn}
        onPlay={play}
        withDate={withDate}
      />
      <SaveViewDialog
        open={naming}
        onCancel={() => setNaming(false)}
        onSave={(name) => {
          store.saveView(name);
          setNaming(false);
        }}
      />
    </ValueSourceContext.Provider>
  );
}

export default observer(LogsPage);
