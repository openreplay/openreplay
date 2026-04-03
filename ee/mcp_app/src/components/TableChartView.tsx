import React from 'react';

interface TableChartViewProps {
  data: {
    title: string;
    metricOf: string;
    data: any;
    startDate?: string;
    endDate?: string;
  };
}

const MAX_DISPLAY = 10;

// ── Inline SVG icons matching frontend IconProvider ──

// icn_url — link icon on light purple bg (LOCATION / pages)
const IconUrl = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <path d="M22 0H10C4.477 0 0 4.477 0 10v12c0 5.523 4.477 10 10 10h12c5.523 0 10-4.477 10-10V10c0-5.523-4.477-10-10-10Z" fill="#E2E4F6"/>
    <path d="M13 21h-2a5 5 0 0 1 0-10h2M19 11h2a5 5 0 1 1 0 10h-2M12 16h8" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// icn_referrer — grid icon on light teal bg
const IconReferrer = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <path d="M22 0H10C4.477 0 0 4.477 0 10v12c0 5.523 4.477 10 10 10h12c5.523 0 10-4.477 10-10V10c0-5.523-4.477-10-10-10Z" fill="#E2F6F0"/>
    <path d="M13 7H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM11 15v4a2 2 0 0 0 2 2h4M23 17h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// icn_fetch_request — wifi/network icon on light purple bg
const IconFetch = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <path d="M22 0H10C4.477 0 0 4.477 0 10v12c0 5.523 4.477 10 10 10h12c5.523 0 10-4.477 10-10V10c0-5.523-4.477-10-10-10Z" fill="#EEE2F6"/>
    <path d="M16 15.925a9.02 9.02 0 0 0-4.892 1.43.632.632 0 0 1-.849-.134l-1-1.333a.564.564 0 0 1 .126-.81A11.859 11.859 0 0 1 16 13.074c2.446 0 4.718.735 6.614 2.001.268.18.322.55.125.812l-.724.96a.629.629 0 0 1-.364.232 5.39 5.39 0 0 0-.803.246c-1.405-.905-3.068-1.401-4.848-1.401Zm10.34-4.837-1 1.333a.615.615 0 0 1-.84.128A15.007 15.007 0 0 0 16 9.925c-3.155 0-6.086.971-8.5 2.624a.615.615 0 0 1-.84-.128l-1-1.333a.573.573 0 0 1 .123-.817A17.848 17.848 0 0 1 16 7.075c3.795 0 7.317 1.182 10.217 3.196.266.185.32.555.123.817Zm-13.348 8.807a5.91 5.91 0 0 1 3.008-.82c.46 0 .906.058 1.337.163.186.045.311.178.367.346a.698.698 0 0 1-.053.547A5.983 5.983 0 0 0 16.925 23v.004c0 .196 0 .391.035.587l-.487.651a.592.592 0 0 1-.947.001l-2.666-3.555c-.198-.263-.141-.632.133-.793Z" fill="#000" stroke="#EEE2F6" strokeWidth=".15"/>
  </svg>
);

// device/desktop — monitor icon on light purple bg
const IconDesktop = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2E4F6"/>
    <path d="M23 8H9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 24h20" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// device/mobile — phone icon
const IconMobile = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2E4F6"/>
    <path d="M20.875 6h-9.75C10.228 6 9.5 6.895 9.5 8v16c0 1.105.727 2 1.625 2h9.75c.898 0 1.625-.895 1.625-2V8c0-1.105-.727-2-1.625-2Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 9h3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// user — simple person icon
const IconUser = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2E4F6"/>
    <circle cx="16" cy="12" r="4" stroke="#000" strokeWidth="2"/>
    <path d="M9 25c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// globe — country icon
const IconGlobe = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2F6F0"/>
    <circle cx="16" cy="16" r="8" stroke="#000" strokeWidth="2"/>
    <ellipse cx="16" cy="16" rx="3.5" ry="8" stroke="#000" strokeWidth="1.5"/>
    <path d="M8 16h16M9 12h14M9 20h14" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// os — chip/platform icon
const IconPlatform = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2E4F6"/>
    <rect x="10" y="10" width="12" height="12" rx="2" stroke="#000" strokeWidth="2"/>
    <path d="M14 10V7M18 10V7M14 25v-3M18 25v-3M10 14H7M10 18H7M25 14h-3M25 18h-3" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// browser — generic window icon (for userBrowser when we can't match a specific browser)
const IconBrowser = () => (
  <svg fill="none" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="10" fill="#E2E4F6"/>
    <rect x="7" y="8" width="18" height="16" rx="2" stroke="#000" strokeWidth="2"/>
    <path d="M7 13h18" stroke="#000" strokeWidth="2"/>
    <circle cx="10" cy="10.5" r="0.75" fill="#000"/><circle cx="12.5" cy="10.5" r="0.75" fill="#000"/><circle cx="15" cy="10.5" r="0.75" fill="#000"/>
  </svg>
);

// Per-item browser icons (simplified but recognizable)
const IconChrome = () => (
  <svg viewBox="2 2 28 28" width="32" height="32">
    <circle cx="16" cy="16" r="13" fill="#f5f5f5"/>
    <path d="M16 2C16 2 24.25 1.63 28.63 9.9H15.3s-2.52-.08-4.67 2.96c-.62 1.28-1.28 2.59-.54 5.18L4.4 8.21S7.66 2.33 16 2Z" fill="#EF3F36"/>
    <path d="M28.2 22.99s-3.81 7.31-13.18 6.95l6.67-11.5s1.33-2.13-.24-5.5c-.8-1.18-1.61-2.4-4.24-3.06h11.39s3.48 5.75-.4 13.11Z" fill="#FCD900"/>
    <path d="M3.86 23.04S-.59 16.1 4.41 8.2l6.66 11.5s1.19 2.21 4.9 2.55c1.42-.1 2.88-.19 4.77-2.12L15.06 29.95S8.31 30.07 3.86 23.04Z" fill="#61BC5B"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
    <circle cx="16" cy="16" r="4.8" fill="#4285F4"/>
  </svg>
);

const IconFirefox = () => (
  <svg viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="13" fill="#f5f5f5"/>
    <circle cx="16" cy="16" r="10" fill="#FF6611"/>
    <circle cx="16" cy="16" r="6" fill="#FFBD4F"/>
    <circle cx="16" cy="16" r="3.5" fill="#FF6611"/>
  </svg>
);

const IconSafari = () => (
  <svg viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="13" fill="#f5f5f5"/>
    <circle cx="16" cy="16" r="10" fill="#006CFF" opacity="0.15"/>
    <circle cx="16" cy="16" r="10" stroke="#006CFF" strokeWidth="1.5" fill="none"/>
    <polygon points="16,7 18.5,14 25,16 18.5,18 16,25 13.5,18 7,16 13.5,14" fill="#006CFF" opacity="0.9"/>
    <polygon points="16,10 17.5,14.5 22,16 17.5,17.5 16,22 14.5,17.5 10,16 14.5,14.5" fill="#FF3B30"/>
  </svg>
);

const IconEdge = () => (
  <svg viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="13" fill="#f5f5f5"/>
    <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12c4.42 0 8.28-2.4 10.35-5.96-1.73 1.2-4.3 1.96-6.35 1.96-4.42 0-8-3.2-8-7.5 0-2.48 1.74-4.5 4-4.5 3.5 0 5.5 3.5 5.5 6 0 0 .5-1.5.5-3C22 8.48 19.52 4 16 4Z" fill="#0078D4"/>
  </svg>
);

// ── Icon resolver ──

type MetricOf = string;

function getMetricTypeIcon(metricOf: MetricOf): (() => React.ReactNode) | null {
  switch (metricOf) {
    case 'LOCATION': return IconUrl;
    case 'REFERRER': return IconReferrer;
    case 'REQUEST':
    case 'FETCH': return IconFetch;
    case 'userDevice': return null; // per-item
    case 'userBrowser': return null; // per-item
    case 'userCountry': return IconGlobe;
    case 'platform': return IconPlatform;
    case 'userId': return IconUser;
    default: return null;
  }
}

function getBrowserIcon(name: string): () => React.ReactNode {
  const s = name.toLowerCase();
  if (s.includes('chrome')) return IconChrome;
  if (s.includes('firefox')) return IconFirefox;
  if (s.includes('safari')) return IconSafari;
  if (s.includes('edge')) return IconEdge;
  return IconBrowser;
}

function getDeviceIcon(name: string): () => React.ReactNode {
  const s = name.toLowerCase();
  if (s.includes('mobile') || s.includes('phone') || s.includes('iphone') || s.includes('android')) return IconMobile;
  return IconDesktop;
}

function getItemIcon(metricOf: string, itemName: string): (() => React.ReactNode) | null {
  if (metricOf === 'userBrowser') return getBrowserIcon(itemName);
  if (metricOf === 'userDevice') return getDeviceIcon(itemName);
  return null;
}

function numberWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}

function getItemInitial(name: string): string {
  if (!name) return '?';
  if (name.startsWith('/')) return name.charAt(1)?.toUpperCase() || '/';
  if (name.startsWith('http')) {
    try { return new URL(name).hostname.charAt(0).toUpperCase(); } catch { /* */ }
  }
  return name.charAt(0).toUpperCase();
}

function TableChartView({ data }: TableChartViewProps) {
  const rawData = data?.data;
  const seriesData = rawData?.values
    ? rawData
    : rawData?.series
      ? Object.values(rawData.series)[0] as { total: number; count: number; values: Array<{ name: string; total: number }> }
      : null;
  const values: Array<{ name: string; total: number }> = seriesData?.values || [];
  const totalCount = seriesData?.count || 1;
  const displayValues = values.slice(0, MAX_DISPLAY);
  const totalItems = seriesData?.total || values.length;
  const maxValue = displayValues.length > 0 ? displayValues[0].total : 1;

  const MetricIcon = getMetricTypeIcon(data.metricOf);

  if (displayValues.length === 0) {
    return (
      <div>
        <div className="view-header">
          <span className="view-title">{data?.title || 'Top Analytics'}</span>
        </div>
        <div className="view-empty">
          <div className="view-empty-title">No data</div>
          <div className="view-empty-text">No data available for the selected period.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="view-header">
        <span className="view-title">
          {data?.title || 'Top Analytics'}
          {data.startDate && data.endDate && (
            <span className="view-title-date">{data.startDate} — {data.endDate}</span>
          )}
        </span>
      </div>
      <div className="view-subtitle">
        {numberWithCommas(totalCount)} total across {totalItems} unique {data.metricOf === 'LOCATION' ? 'pages' : 'items'}
      </div>

      <div className="table-list">
        {displayValues.map((item, i) => {
          const progress = maxValue > 0 ? Math.round((item.total / maxValue) * 100) : 0;
          const ItemIcon = getItemIcon(data.metricOf, item.name);
          const Icon = ItemIcon || MetricIcon;

          return (
            <div key={i} className="table-row">
              <div className="table-row-icon">
                {Icon
                  ? <Icon />
                  : <span className="table-row-initial">{getItemInitial(item.name)}</span>
                }
              </div>
              <div className="table-row-content">
                <div className="table-row-header">
                  <span className="table-row-name" title={item.name}>{item.name}</span>
                  <span className="table-row-count">{numberWithCommas(item.total)}</span>
                </div>
                <div className="table-row-bar-track">
                  <div
                    className="table-row-bar-fill"
                    style={{ width: `${Math.max(progress, 1)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalItems > MAX_DISPLAY && (
        <div className="table-chart-footer">
          {totalItems - MAX_DISPLAY} more items
        </div>
      )}
    </div>
  );
}

export default TableChartView;
