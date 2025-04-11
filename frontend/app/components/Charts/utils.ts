import { formatTimeOrDate } from 'App/date';

export const colors = [
  '#394EFF',
  '#3EAAAF',
  '#9276da',
  '#ceba64',
  '#bc6f9d',
  '#966fbc',
  '#64ce86',
  '#e06da3',
  '#6dabe0',
];

/**
 * Match colors by baseName so “Previous Series 1” uses the same color as “Series 1”.
 */
export function assignColorsByBaseName(series: any[]) {
  const palette = colors;

  const colorMap: Record<string, string> = {};
  let colorIndex = 0;

  // Assign to current lines first
  series.forEach((s) => {
    if (!s._hideInLegend) {
      const baseName = s._baseName || s.name;
      if (!colorMap[baseName]) {
        colorMap[baseName] = palette[colorIndex % palette.length];
        colorIndex++;
      }
    }
  });

  series.forEach((s) => {
    const baseName = s._baseName || s.name;
    const color = colorMap[baseName];
    s.itemStyle = { ...s.itemStyle, color };
    s.lineStyle = { ...(s.lineStyle || {}), color };
  });
}

function buildCategoryColorMap(categories: string[]): Record<number, string> {
  const colorMap: Record<number, string> = {};
  categories.forEach((_, i) => {
    colorMap[i] = colors[i % colors.length];
  });
  return colorMap;
}

/**
 * For each series, transform its data array to an array of objects
 * with `value` and `itemStyle.color` based on the category index.
 */
export function assignColorsByCategory(series: any[], categories: string[]) {
  const categoryColorMap = buildCategoryColorMap(categories);

  series.forEach((s, si) => {
    s.data = s.data.map((val: any, i: number) => {
      const color = categoryColorMap[i];
      if (typeof val === 'number') {
        return {
          value: val,
          itemStyle: { color },
        };
      }
      return {
        ...val,
        itemStyle: {
          ...(val.itemStyle || {}),
          color,
        },
      };
    });
    s.itemStyle = { ...s.itemStyle, color: colors[si] };
  });
}

/**
 *  Show the hovered “current” or “previous” line + the matching partner (if it exists).
 */
export function customTooltipFormatter(uuid: string) {
  return (params: any): string => {
    // With trigger='item', params is a single object describing the hovered point
    // { seriesName, dataIndex, data, marker, color, encode, ... }
    if (!params) return '';
    const { seriesName, dataIndex } = params;
    const baseName = seriesName.replace(/^Previous\s+/, '');

    if (!Array.isArray(params.data)) {
      const isPrevious = /Previous/.test(seriesName);
      const categoryName = (window as any).__yAxisData?.[uuid]?.[dataIndex];
      const fullname = isPrevious ? `Previous ${categoryName}` : categoryName;
      const partnerName = isPrevious
        ? categoryName
        : `Previous ${categoryName}`;
      const partnerValue = (window as any).__seriesValueMap?.[uuid]?.[
        partnerName
      ];

      let str = `
        <div class="flex flex-col gap-1 bg-white shadow border rounded p-2 z-50">
          <div class="flex gap-2 items-center">
            <div style="
              border-radius: 99px; 
              background: ${params.color}; 
              width: 1rem; 
              height: 1rem;">
            </div>
            <div class="font-medium text-black">${fullname}</div>
          </div>
    
          <div style="border-left: 2px solid ${
            params.color
          };" class="flex flex-col px-2 ml-2">
            <div class="text-neutral-600 text-sm"> 
              Total:
            </div>
            <div class="flex items-center gap-1">
              <div class="font-medium text-black">${params.value}</div>
              ${buildCompareTag(params.value, partnerValue)}
            </div>
          </div>
      `;
      if (partnerValue !== undefined) {
        const partnerColor =
          (window as any).__seriesColorMap?.[uuid]?.[partnerName] || '#999';
        str += `
      <div style="border-left: 2px dashed ${partnerColor};" class="flex flex-col px-2 ml-2">
        <div class="text-neutral-600 text-sm"> 
          ${isPrevious ? 'Current' : 'Previous'} Total:
        </div>
        <div class="flex items-center gap-1">
          <div class="font-medium">${partnerValue ?? '—'}</div>
          ${buildCompareTag(partnerValue, params.value)}
        </div>
      </div>`;
      }

      str += '</div>';

      return str;
    }
    const isPrevious = /^Previous\s+/.test(seriesName);
    const partnerName = isPrevious ? baseName : `Previous ${baseName}`;
    // 'value' of the hovered point
    const yKey = params.encode.y[0]; // "Series 1"
    const value = params.data?.[yKey];

    const timestamp = (window as any).__timestampMap?.[uuid]?.[dataIndex];
    const comparisonTimestamp = (window as any).__timestampCompMap?.[uuid]?.[
      dataIndex
    ];

    // Get partner’s value from some global map

    const partnerVal = (window as any).__seriesValueMap?.[uuid]?.[
      partnerName
    ]?.[dataIndex];

    const categoryLabel = (window as any).__categoryMap[uuid]
      ? (window as any).__categoryMap[uuid][dataIndex]
      : dataIndex;

    const firstTs = isPrevious ? comparisonTimestamp : timestamp;
    const secondTs = isPrevious ? timestamp : comparisonTimestamp;
    let tooltipContent = `
    <div class="flex flex-col gap-1 bg-white shadow border rounded p-2 z-50">
      <div class="flex gap-2 items-center">
        <div style="
          border-radius: 99px; 
          background: ${params.color}; 
          width: 1rem; 
          height: 1rem;">
        </div>
        <div class="font-medium text-black">${seriesName}</div>
      </div>

      <div style="border-left: 2px solid ${
        params.color
      };" class="flex flex-col px-2 ml-2">
        <div class="text-neutral-600 text-sm"> 
          ${firstTs ? formatTimeOrDate(firstTs) : categoryLabel}
        </div>
        <div class="flex items-center gap-1">
          <div class="font-medium text-black">${value ?? '—'}</div>
          ${buildCompareTag(value, partnerVal)}
        </div>
      </div>
  `;

    if (partnerVal !== undefined) {
      const partnerColor =
        (window as any).__seriesColorMap?.[uuid]?.[partnerName] || '#999';
      tooltipContent += `
      <div style="border-left: 2px dashed ${partnerColor};" class="flex flex-col px-2 ml-2">
        <div class="text-neutral-600 text-sm"> 
          ${secondTs ? formatTimeOrDate(secondTs) : categoryLabel}
        </div>
        <div class="flex items-center gap-1">
          <div class="font-medium">${partnerVal ?? '—'}</div>
        </div>
      </div>
    `;
    }

    tooltipContent += '</div>';
    return tooltipContent;
  };
}

/**
 * Build a small "compare" tag to show ▲ or ▼ plus absolute delta plus percent change.
 * For example, if val=120, prevVal=100 => ▲ 20 (20%)
 */
function buildCompareTag(val: number, prevVal: number): string {
  if (val == null || prevVal == null) {
    return '';
  }

  const delta = val - prevVal;
  const isHigher = delta > 0;
  const arrow = isHigher ? '▲' : '▼';
  const absDelta = Math.abs(delta);
  const ratio = prevVal !== 0 ? ((delta / prevVal) * 100).toFixed(2) : null;

  const tagColor = isHigher ? '#D1FADF' : '#FEE2E2';
  const arrowColor = isHigher ? '#059669' : '#DC2626';

  return `
    <div style="
      display: inline-flex; 
      align-items: center; 
      gap: 4px; 
      background: ${tagColor}; 
      color: ${arrowColor}; 
      padding: 2px 6px;
      border-radius: 4px; 
      font-size: 0.75rem;">
      <span>${arrow}</span>
      <span>${absDelta}</span>
      <span>${ratio ? `(${ratio}%)` : ''}</span>
    </div>
  `;
}

/**
 * Build category labels (["Sun", "Mon", ...]) from the "current" data only
 */
export function buildCategories(data: DataProps['data']): string[] {
  return data.chart.map((item) => item.time);
}

/**
 * Create a dataset with dimension [idx, ...names].
 * The `idx` dimension aligns with xAxis = "category"
 * (which is dates in our case)
 */
export function createDataset(id: string, data: DataProps['data']) {
  const dimensions = ['idx', ...data.namesMap];
  const source = data.chart.map((item, idx) => {
    const row: (number | undefined)[] = [idx];
    data.namesMap.forEach((name) => {
      const val =
        typeof item[name] === 'number' ? (item[name] as number) : undefined;
      row.push(val);
    });
    return row;
  });
  return { id, dimensions, source };
}

/**
 * Create line series referencing the dataset dimension by name.
 * `_baseName` is used to match “Series 1” <-> “Previous Series 1”.
 */
export function createSeries(
  data: DataProps['data'],
  datasetId: string,
  dashed: boolean,
  hideFromLegend: boolean,
) {
  return data.namesMap.filter(Boolean).map((fullName) => {
    const baseName = fullName.replace(/^Previous\s+/, '');
    return {
      name: fullName,
      _baseName: baseName,
      type: 'line',
      animation: false,
      datasetId,
      encode: { x: 'idx', y: fullName },
      lineStyle: dashed ? { type: 'dashed' } : undefined,
      showSymbol: false,
      // custom flag to hide prev data from legend
      _hideInLegend: hideFromLegend,
      itemStyle: { opacity: 1 },
      emphasis: {
        focus: 'series',
        itemStyle: { opacity: 1 },
        lineStyle: { opacity: 1 },
      },
      blur: {
        itemStyle: { opacity: 0.2 },
        lineStyle: { opacity: 0.2 },
      },
    };
  });
}

export function buildDatasetsAndSeries(props: DataProps) {
  const mainDataset = createDataset('current', props.data);
  const mainSeries = createSeries(props.data, 'current', false, false);

  let compDataset: Record<string, any> | null = null;
  let compSeries: Record<string, any>[] = [];
  if (props.compData && props.compData.chart?.length) {
    compDataset = createDataset('previous', props.compData);
    compSeries = createSeries(props.compData, 'previous', true, true);
  }

  const datasets = compDataset ? [mainDataset, compDataset] : [mainDataset];
  const series = [...mainSeries, ...compSeries];
  assignColorsByBaseName(series as any);

  return { datasets, series };
}

export interface DataItem {
  time: string;
  timestamp: number;
  [seriesName: string]: number | string;
}

export interface DataProps {
  data: {
    chart: DataItem[];
    // series names
    namesMap: string[];
  };
  compData?: {
    chart: DataItem[];
    // same as data.namesMap, but with "Previous" prefix
    namesMap: string[];
  };
}
