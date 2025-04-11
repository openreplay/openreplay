import { numberWithCommas } from 'App/utils';
import { colors } from './utils';

export function buildPieData(
  chart: Array<Record<string, any>>,
  namesMap: string[],
) {
  const result: { name: string; value: number }[] = namesMap.map((name) => {
    let sum = 0;
    chart.forEach((row) => {
      sum += Number(row[name] ?? 0);
    });
    return { name, value: sum };
  });
  return result;
}

export function pieTooltipFormatter(params: any) {
  const { name, value, marker, percent } = params;
  return `
    <div class="flex flex-col gap-1 bg-white shadow border rounded p-2 z-50">
      <div style="margin-bottom: 2px;">${marker} <b>${name}</b></div>
      <div>${numberWithCommas(value)} (${percent}%)</div>
    </div>
  `;
}

export function pickColorByIndex(idx: number) {
  return colors[idx % colors.length];
}
