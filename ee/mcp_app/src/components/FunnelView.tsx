interface FunnelViewProps {
  data: {
    steps: string[];
    data: any;
    startDate?: string;
    endDate?: string;
  };
}

function numberWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}

function FunnelView({ data }: FunnelViewProps) {
  // API may return { series: { "Series 1": { stages } } } or flat { stages }
  const rawData = data?.data;
  const unwrapped = rawData?.stages
    ? rawData
    : rawData?.series
      ? (() => {
          const first = Object.values(rawData.series)[0] as any;
          return first?.stages ? first : first?.$overall || rawData;
        })()
      : rawData;
  const stages = unwrapped?.stages || [];
  const steps = data?.steps || [];
  const firstCount = stages[0]?.count || 0;
  const lastCount = stages.length > 0 ? stages[stages.length - 1].count : 0;
  const overallConvPct = firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) : '0';
  const lostCount = firstCount - lastCount;
  const lostPct = firstCount > 0 ? ((lostCount / firstCount) * 100).toFixed(1) : '0';

  if (stages.length === 0) {
    return (
      <div>
        <div className="view-header">
          <span className="view-title">Funnel Analysis</span>
        </div>
        <div className="view-empty">
          <div className="view-empty-title">No funnel data</div>
          <div className="view-empty-text">No data available for the selected steps and period.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="view-header">
        <span className="view-title">
          Funnel Analysis
          {data.startDate && data.endDate && (
            <span className="view-title-date">{data.startDate} — {data.endDate}</span>
          )}
        </span>
      </div>
      <div className="view-subtitle">{stages.length} steps &middot; {numberWithCommas(firstCount)} sessions entered</div>

      <div className="funnel-stages">
        {stages.map((stage: any, i: number) => {
          const label = stage.value?.[0] || steps[i] || `Step ${i + 1}`;
          const pctOfFirst = firstCount > 0 ? (stage.count / firstCount) * 100 : 0;
          const prevCount = i > 0 ? stages[i - 1].count : stage.count;
          const droppedCount = i > 0 ? prevCount - stage.count : 0;
          const completedPct = prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : '100';

          return (
            <div key={i} className="funnel-stage">
              {/* Index badge */}
              <div className="funnel-index">{i + 1}</div>

              {/* Bar section */}
              <div className="funnel-bar-section">
                {/* Step label */}
                <div className="funnel-label" title={label}>{label}</div>

                {/* Bar: filled + empty (hatched) */}
                <div className="funnel-bar">
                  <div
                    className="funnel-bar-filled"
                    style={{ width: `${Math.max(pctOfFirst, 1)}%` }}
                  >
                    {pctOfFirst >= 12 && (
                      <span className="funnel-bar-pct">{pctOfFirst.toFixed(1)}%</span>
                    )}
                  </div>
                  {pctOfFirst < 100 && (
                    <div
                      className="funnel-bar-empty"
                      style={{ width: `${100 - pctOfFirst}%` }}
                    />
                  )}
                </div>

                {/* Below-bar stats */}
                <div className="funnel-bar-stats">
                  <div className="funnel-bar-completed">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#3EAAAF">
                      <path d="M4 12h16M13 5l7 7-7 7" stroke="#3EAAAF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{completedPct}% &middot; {numberWithCommas(stage.count)}</span>
                  </div>
                  {i > 0 && (
                    <div className={`funnel-bar-dropped${droppedCount > 0 ? '' : ' no-drop'}`}>
                      <svg viewBox="0 0 16 16" width="12" height="12" fill={droppedCount > 0 ? '#cc0000' : '#ccc'}>
                        <path d="M8 1l6 10H2z" transform="rotate(180 8 8)"/>
                      </svg>
                      <span>{numberWithCommas(droppedCount)} Skipped</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary tags */}
      {stages.length > 1 && (
        <div className="funnel-summary">
          <div className="funnel-summary-item">
            <span className="funnel-summary-label">Total conversion</span>
            <span className="funnel-tag funnel-tag-good">{numberWithCommas(lastCount)}</span>
            <span className="funnel-summary-pct">{overallConvPct}%</span>
          </div>
          <div className="funnel-summary-item">
            <span className="funnel-summary-label">Lost conversion</span>
            <span className="funnel-tag funnel-tag-bad">{numberWithCommas(lostCount)}</span>
            <span className="funnel-summary-pct">{lostPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FunnelView;
