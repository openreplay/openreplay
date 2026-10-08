import React from 'react';

import { CompareTag } from 'App/components/Charts/CompareTag';
import 'App/components/Dashboard/charts.css';

interface Props {
  colors?: any;
  label?: string;
  hideLegend?: boolean;
  height?: number;
  inGrid?: boolean;
  onClick?: (event: any) => void;
  values: {
    value: number;
    compData?: number;
    series: string;
    valueLabel?: string;
  }[];
  onSeriesFocus?: (name: string) => void;
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
      ? `${(n / 1000).toFixed(1)}k`
      : n.toLocaleString();

/** One tile per series: the total, and its change against the compared period. */
function BigNumChart({
  label = 'Number of Sessions',
  values,
  onSeriesFocus,
  hideLegend,
}: Props) {
  const legend = !hideLegend && values.length > 1;
  return (
    <div
      className={`m-bignum${onSeriesFocus ? '' : ' is-inert'}`}
      style={{
        gridTemplateColumns: `repeat(${Math.min(5, Math.max(1, values.length))}, minmax(0, 1fr))`,
      }}
    >
      {values.map((v, i) => {
        const delta = v.compData
          ? Math.round(((v.value - v.compData) / v.compData) * 1000) / 10
          : null;
        const body = (
          <>
            {legend ? (
              <span className="m-bignum__series">
                <i
                  className="m-bignum__swatch"
                  style={{ background: `var(--m-chart-${(i % 8) + 1})` }}
                  aria-hidden="true"
                />
                <span className="m-truncate">{v.series}</span>
              </span>
            ) : null}
            <span className="m-bignum__value">
              {fmt(v.value ?? 0)}
              {v.valueLabel ? (
                <span className="m-bignum__unit">{v.valueLabel}</span>
              ) : null}
            </span>
            <span className="m-bignum__foot">
              {label}
              {delta != null ? <CompareTag delta={delta} /> : null}
            </span>
          </>
        );
        return onSeriesFocus ? (
          <button
            key={v.series}
            type="button"
            className="m-bignum__tile"
            aria-label={`${v.series}: ${(v.value ?? 0).toLocaleString()}`}
            onClick={(e) => {
              e.stopPropagation();
              onSeriesFocus(v.series);
            }}
          >
            {body}
          </button>
        ) : (
          <div key={v.series} className="m-bignum__tile">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export default BigNumChart;
