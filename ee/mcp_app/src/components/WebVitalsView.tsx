interface Stats {
  Min: number;
  Avg: number;
  Max: number;
  P50: number;
  P75: number;
  P90: number;
  MinStatus: 'good' | 'medium' | 'bad';
  AvgStatus: 'good' | 'medium' | 'bad';
  MaxStatus: 'good' | 'medium' | 'bad';
  P50Status: 'good' | 'medium' | 'bad';
  P75Status: 'good' | 'medium' | 'bad';
  P90Status: 'good' | 'medium' | 'bad';
}

interface WebVitalsViewProps {
  data: {
    data: any;
    startDate?: string;
    endDate?: string;
  };
}

const defaultStats: Stats = {
  Min: 0, Avg: 0, Max: 0, P50: 0, P75: 0, P90: 0,
  MinStatus: 'good', AvgStatus: 'good', MaxStatus: 'good',
  P50Status: 'good', P75Status: 'good', P90Status: 'good',
};

const metrics = [
  { key: 'domBuildingTime', abbr: 'DOM', name: 'DOM Complete' },
  { key: 'ttfb', abbr: 'TTFB', name: 'Time to First Byte' },
  { key: 'speedIndex', abbr: 'SI', name: 'Speed Index' },
  { key: 'firstContentfulPaintTime', abbr: 'FCP', name: 'First Contentful Paint' },
  { key: 'lcp', abbr: 'LCP', name: 'Largest Contentful Paint' },
  { key: 'cls', abbr: 'CLS', name: 'Cumulative Layout Shift' },
];

const statusToClass: Record<string, string> = {
  good: 'vitals-card--good',
  medium: 'vitals-card--warning',
  bad: 'vitals-card--bad',
};

const statusToVar: Record<string, string> = {
  good: 'var(--or-status-good)',
  medium: 'var(--or-status-warning)',
  bad: 'var(--or-status-bad)',
};

function formatValue(value: number, metricKey: string): string {
  if (!value && value !== 0) return 'N/A';
  if (metricKey === 'cls') {
    return value < 0.01 ? value.toFixed(4) : value.toFixed(3);
  }
  if (value > 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function WebVitalsView({ data }: WebVitalsViewProps) {
  // API may return { series: { ... } } or flat vitals object
  const rawData = data?.data;
  const vitals = (rawData?.series ? Object.values(rawData.series)[0] : rawData) || {};

  return (
    <div>
      <div className="view-header">
        <span className="view-title">
          Web Vitals
          {data.startDate && data.endDate && (
            <span className="view-title-date">{data.startDate} — {data.endDate}</span>
          )}
        </span>
      </div>
      <div className="view-subtitle">Showing median (P50) values</div>

      <div className="view-container">
        <div className="vitals-grid">
          {metrics.map(({ key, abbr, name }) => {
            const stats: Stats = { ...defaultStats, ...(vitals as any)[key] };
            const status = stats.P50Status;
            const colorVar = statusToVar[status] || 'var(--or-text-secondary)';
            const cardClass = statusToClass[status] || '';

            return (
              <div key={key} className={`vitals-card ${cardClass}`}>
                <div>
                  <div className="vitals-card-label" style={{ color: colorVar }}>{abbr}</div>
                  <div className="vitals-card-name">{name}</div>
                </div>
                <div className="vitals-card-value" style={{ color: colorVar }}>
                  {formatValue(stats.P50, key)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <details className="vitals-detail">
        <summary>Detailed Percentiles</summary>
        <table className="vitals-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>P50</th>
              <th>P75</th>
              <th>P90</th>
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, abbr }) => {
              const stats: Stats = { ...defaultStats, ...(vitals as any)[key] };
              return (
                <tr key={key}>
                  <td>{abbr}</td>
                  <td style={{ color: statusToVar[stats.P50Status] }}>
                    {formatValue(stats.P50, key)}
                  </td>
                  <td style={{ color: statusToVar[stats.P75Status] }}>
                    {formatValue(stats.P75, key)}
                  </td>
                  <td style={{ color: statusToVar[stats.P90Status] }}>
                    {formatValue(stats.P90, key)}
                  </td>
                  <td style={{ color: statusToVar[stats.AvgStatus] }}>
                    {formatValue(stats.Avg, key)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default WebVitalsView;
