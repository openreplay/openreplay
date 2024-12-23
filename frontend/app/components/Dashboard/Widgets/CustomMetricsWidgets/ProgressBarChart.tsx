import React from 'react';

interface Props {
  data: { chart: any[], namesMap: string[] };
  compData: { chart: any[], namesMap: string[] } | null;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}

function ProgressBarChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    label = 'Number of Sessions',
  } = props;

  const getTotalForSeries = (series: string, isComp: boolean) => {
    if (isComp) {
      if (!compData) return 0;
      return compData.chart.reduce((acc, curr) => acc + curr[series], 0);
    }
    return data.chart.reduce((acc, curr) => acc + curr[series], 0);
  }

  const formattedNumber = (num: number) => {
    return Intl.NumberFormat().format(num);
  }

  // Group the data into pairs (original + comparison)
  const groupedData: Array<{ original: any, comparison: any }> = [];
  for (let i = 0; i < data.namesMap.length; i++) {
    if (!data.namesMap[i]) continue;
    
    const original = {
      name: data.namesMap[i],
      value: getTotalForSeries(data.namesMap[i], false),
      isComp: false,
      index: i
    };
    
    const comparison = compData && compData.namesMap[i] ? {
      name: compData.namesMap[i],
      value: getTotalForSeries(compData.namesMap[i], true),
      isComp: true,
      index: i
    } : null;

    groupedData.push({ original, comparison });
  }

  // Find highest value among all data points
  const highest = groupedData.reduce((acc, curr) => {
    const maxInGroup = Math.max(
      curr.original.value,
      curr.comparison ? curr.comparison.value : 0
    );
    return Math.max(acc, maxInGroup);
  }, 0);

  return (
    <div className="w-full flex flex-col gap-3 ps-3 justify-center" style={{ height: 240 }}>
      {groupedData.map((group, i) => (
        <div key={i}           className={`flex flex-col ${i < groupedData.length - 1 && group.comparison ? 'border-b border-dashed border-[0,0,0,.15] pb-3' : ''}`}>
          <div className="flex items-center">
            <div className="flex items-center" style={{ flex: 1 }}>
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: colors[group.original.index] }} 
              />
              <span>{group.original.name}</span>
            </div>
            <div className="flex items-center gap-2" style={{ flex: 4 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 8,
                  backgroundColor: colors[group.original.index],
                  width: `${(group.original.value/highest)*100}%`
                }}
              />
              <div>{formattedNumber(group.original.value)}</div>
            </div>
            <div style={{ flex: 1 }} />
          </div>
          {group.comparison && (
            <div className="flex items-center">
              <div className="invisible flex items-center" style={{ flex:   1 }}>
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: colors[group.comparison.index] }} 
                />
                <span>{group.comparison.name}</span>
              </div>
              <div className="flex items-center gap-2" style={{ flex: 4 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 8,
                    backgroundImage: `repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1.5px, ${colors[group.comparison.index]} 1.5px, ${colors[group.comparison.index]} 4.5px)`,
                    backgroundSize: '20px 20px',
                    width: `${(group.comparison.value/highest)*100}%`
                  }}
                />
                <div>{formattedNumber(group.comparison.value)}</div>
              </div>
              <div style={{ flex: 1 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProgressBarChart;