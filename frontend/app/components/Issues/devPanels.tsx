import React from 'react';

/* Mock developer-tool panels for the issue session player. These exist to make
   the player's dev panel mirror the real session replay (which has Performance,
   GraphQL, State, Events, Profiler, Backend Logs on top of X-Ray/Console/
   Network). They are presentational only — fed static mock data — so the demo
   shows the full toolset without the live replay engine. X-Ray / Console /
   Network keep using the existing Spot panels; these cover the rest. */

const wrap = 'h-full overflow-y-auto bg-white text-sm';
const head =
  'sticky top-0 z-10 bg-white flex items-center gap-4 px-4 py-2 border-b text-xs font-semibold uppercase';
const headStyle = {
  color: 'var(--color-gray-medium)',
  letterSpacing: '0.05em',
  borderColor: 'var(--color-gray-light)',
};
const rowStyle = { borderColor: 'var(--color-gray-lightest)' };
const mono = { fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' };

function levelColor(level: string): string {
  if (level === 'error') return 'var(--color-red)';
  if (level === 'warn') return 'var(--color-orange)';
  if (level === 'info') return 'var(--color-teal)';
  return 'var(--color-gray-medium)';
}

/* ---- Performance ---- */
const PERF_STATS = [
  { label: 'Avg CPU', value: '38%' },
  { label: 'Peak CPU', value: '91%' },
  { label: 'Avg Memory', value: '212 MB' },
  { label: 'Peak Memory', value: '486 MB' },
  { label: 'Avg FPS', value: '54' },
  { label: 'Min FPS', value: '11' },
  { label: 'DOM Nodes', value: '3,418' },
  { label: 'Long Tasks', value: '7' },
];
// a fixed pseudo-waveform so the chart looks alive without randomness
const PERF_SERIES = [32, 41, 38, 55, 62, 48, 70, 91, 64, 52, 44, 39, 47, 58, 73, 61, 49, 42, 36, 40];

export function PerformancePanel() {
  return (
    <div className={wrap}>
      <div className={head} style={headStyle}>
        <span>Performance</span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2">
          {PERF_STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: 'var(--color-gray-light)' }}
            >
              <div className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
                {s.label}
              </div>
              <div className="font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--color-gray-medium)' }}>
            CPU over time
          </div>
          <div
            className="flex items-end gap-1 rounded-lg border p-2"
            style={{ height: 96, borderColor: 'var(--color-gray-light)' }}
          >
            {PERF_SERIES.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${v}%`,
                  background:
                    v > 80
                      ? 'var(--color-red)'
                      : v > 60
                        ? 'var(--color-orange)'
                        : 'var(--color-teal)',
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- GraphQL ---- */
const GRAPHQL = [
  { op: 'GetCart', type: 'query', status: 200, ms: 142 },
  { op: 'CreatePaymentIntent', type: 'mutation', status: 500, ms: 1180 },
  { op: 'GetShippingRates', type: 'query', status: 200, ms: 96 },
  { op: 'ApplyCoupon', type: 'mutation', status: 200, ms: 210 },
  { op: 'GetUserProfile', type: 'query', status: 200, ms: 64 },
  { op: 'PlaceOrder', type: 'mutation', status: 502, ms: 2030 },
];

export function GraphQLPanel() {
  return (
    <div className={wrap}>
      <div className={head} style={headStyle}>
        <span className="flex-1">Operation</span>
        <span style={{ width: 80 }}>Type</span>
        <span style={{ width: 60 }}>Status</span>
        <span style={{ width: 70, textAlign: 'right' }}>Time</span>
      </div>
      {GRAPHQL.map((r, i) => {
        const bad = r.status >= 400;
        return (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-2 border-b"
            style={rowStyle}
          >
            <span className="flex-1 truncate" style={{ ...mono, color: 'var(--color-gray-darkest)' }}>
              {r.op}
            </span>
            <span style={{ width: 80, color: 'var(--color-gray-medium)' }}>{r.type}</span>
            <span style={{ width: 60, color: bad ? 'var(--color-red)' : 'var(--color-teal)' }}>
              {r.status}
            </span>
            <span style={{ width: 70, textAlign: 'right', color: 'var(--color-gray-dark)' }}>
              {r.ms} ms
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- State (Redux/Store actions) ---- */
const ACTIONS = [
  { type: 'cart/itemsLoaded', t: '0:03' },
  { type: 'checkout/opened', t: '0:11' },
  { type: 'payment/cardEntered', t: '0:19' },
  { type: 'payment/submitRequested', t: '0:22' },
  { type: 'payment/declined', t: '0:24' },
  { type: 'ui/errorToastSuppressed', t: '0:24' },
  { type: 'payment/retryRequested', t: '0:31' },
];
const STATE_SNIPPET = `{
  "cart": { "items": 3, "total": 1098.00, "currency": "USD" },
  "payment": {
    "status": "declined",
    "lastError": null,        // <- never surfaced to UI
    "attempts": 2
  },
  "ui": { "toast": null, "placeOrderBtn": "idle" }
}`;

export function StatePanel() {
  return (
    <div className={`${wrap} flex`}>
      <div className="flex-1 border-r" style={{ borderColor: 'var(--color-gray-light)' }}>
        <div className={head} style={headStyle}>
          <span>Dispatched actions</span>
        </div>
        {ACTIONS.map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2 border-b"
            style={rowStyle}
          >
            <span style={{ ...mono, color: 'var(--color-gray-darkest)' }}>{a.type}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-gray-medium)' }}>
              {a.t}
            </span>
          </div>
        ))}
      </div>
      <div style={{ width: '46%' }}>
        <div className={head} style={headStyle}>
          <span>State at 0:24</span>
        </div>
        <pre
          className="p-4 text-xs whitespace-pre-wrap"
          style={{ ...mono, color: 'var(--color-gray-dark)' }}
        >
          {STATE_SNIPPET}
        </pre>
      </div>
    </div>
  );
}

/* ---- Events (stack events) ---- */
const EVENTS = [
  { name: 'page_view', source: 'Analytics', t: '0:01' },
  { name: 'add_to_cart', source: 'Analytics', t: '0:02' },
  { name: 'begin_checkout', source: 'GA4', t: '0:11' },
  { name: 'add_payment_info', source: 'GA4', t: '0:19' },
  { name: 'exception', source: 'Sentry', t: '0:24', error: true },
  { name: 'purchase_failed', source: 'Segment', t: '0:24', error: true },
];

export function EventsPanel() {
  return (
    <div className={wrap}>
      <div className={head} style={headStyle}>
        <span className="flex-1">Event</span>
        <span style={{ width: 120 }}>Source</span>
        <span style={{ width: 60, textAlign: 'right' }}>Time</span>
      </div>
      {EVENTS.map((e, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2 border-b" style={rowStyle}>
          <span
            className="flex-1 truncate"
            style={{ ...mono, color: e.error ? 'var(--color-red)' : 'var(--color-gray-darkest)' }}
          >
            {e.name}
          </span>
          <span style={{ width: 120, color: 'var(--color-gray-medium)' }}>{e.source}</span>
          <span
            className="tabular-nums"
            style={{ width: 60, textAlign: 'right', color: 'var(--color-gray-dark)' }}
          >
            {e.t}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- Profiler ---- */
const PROFILE = [
  { fn: 'CheckoutForm.render', calls: 42, total: 318, avg: 7.6 },
  { fn: 'validateExpiry', calls: 128, total: 240, avg: 1.9 },
  { fn: 'PaymentProvider.submit', calls: 2, total: 2210, avg: 1105 },
  { fn: 'CartSummary.recompute', calls: 18, total: 96, avg: 5.3 },
  { fn: 'useFieldArray.update', calls: 64, total: 71, avg: 1.1 },
];

export function ProfilerPanel() {
  return (
    <div className={wrap}>
      <div className={head} style={headStyle}>
        <span className="flex-1">Function</span>
        <span style={{ width: 70, textAlign: 'right' }}>Calls</span>
        <span style={{ width: 90, textAlign: 'right' }}>Total</span>
        <span style={{ width: 90, textAlign: 'right' }}>Avg</span>
      </div>
      {PROFILE.map((p, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2 border-b" style={rowStyle}>
          <span className="flex-1 truncate" style={{ ...mono, color: 'var(--color-gray-darkest)' }}>
            {p.fn}
          </span>
          <span style={{ width: 70, textAlign: 'right', color: 'var(--color-gray-medium)' }}>
            {p.calls}
          </span>
          <span style={{ width: 90, textAlign: 'right', color: 'var(--color-gray-dark)' }}>
            {p.total} ms
          </span>
          <span
            style={{
              width: 90,
              textAlign: 'right',
              color: p.avg > 500 ? 'var(--color-red)' : 'var(--color-gray-dark)',
            }}
          >
            {p.avg} ms
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- Backend Logs ---- */
const LOGS = [
  { t: '12:46:21', level: 'info', svc: 'api-gateway', msg: 'POST /v1/payments 202 accepted' },
  { t: '12:46:21', level: 'info', svc: 'payments', msg: 'charge.create id=ch_8f2a provider=stripe' },
  { t: '12:46:22', level: 'warn', svc: 'payments', msg: 'provider latency 1180ms over threshold (800ms)' },
  { t: '12:46:22', level: 'error', svc: 'payments', msg: 'charge declined: card_declined (do_not_honor)' },
  { t: '12:46:22', level: 'error', svc: 'api-gateway', msg: 'POST /v1/payments 502 upstream returned decline' },
  { t: '12:46:23', level: 'info', svc: 'webhooks', msg: 'payment_intent.payment_failed emitted' },
];

export function BackendLogsPanel() {
  return (
    <div className={wrap}>
      <div className={head} style={headStyle}>
        <span>Backend Logs</span>
        <span className="ml-auto font-normal normal-case" style={{ color: 'var(--color-gray-medium)' }}>
          stripe · datadog
        </span>
      </div>
      {LOGS.map((l, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-1.5 border-b" style={{ ...rowStyle, ...mono }}>
          <span className="tabular-nums shrink-0" style={{ color: 'var(--color-gray-medium)' }}>
            {l.t}
          </span>
          <span
            className="shrink-0 uppercase font-semibold"
            style={{ width: 44, color: levelColor(l.level), fontSize: 11 }}
          >
            {l.level}
          </span>
          <span className="shrink-0" style={{ width: 96, color: 'var(--color-teal)' }}>
            {l.svc}
          </span>
          <span style={{ color: 'var(--color-gray-dark)' }}>{l.msg}</span>
        </div>
      ))}
    </div>
  );
}
