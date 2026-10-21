import { useChartTheme } from '@/ui/data/chart';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Sparkline, { withAlpha } from 'Components/Charts/Sparkline';

interface Props {
  list: any;
  disabled?: boolean;
}
const PerformanceGraph = React.memo((props: Props) => {
  const theme = useChartTheme();
  const { t } = useTranslation();
  const { list, disabled } = props;

  const finalValues = React.useMemo(() => {
    const cpuMax = list.reduce(
      (acc: number, item: any) => Math.max(acc, item.cpu),
      0,
    );
    const cpuMin = list.reduce(
      (acc: number, item: any) => Math.min(acc, item.cpu),
      Infinity,
    );

    const memoryMin = list.reduce(
      (acc: number, item: any) => Math.min(acc, item.usedHeap),
      Infinity,
    );
    const memoryMax = list.reduce(
      (acc: number, item: any) => Math.max(acc, item.usedHeap),
      0,
    );

    const convertToPercentage = (val: number, max: number, min: number) =>
      ((val - min) / (max - min)) * 100;
    const cpuValues = list.map((item: any) =>
      convertToPercentage(item.cpu, cpuMax, cpuMin),
    );
    const memoryValues = list.map((item: any) =>
      convertToPercentage(item.usedHeap, memoryMax, memoryMin),
    );
    const mergeArraysWithMaxNumber = (arr1: any[], arr2: any[]) => {
      const maxLength = Math.max(arr1.length, arr2.length);
      const result = [];
      for (let i = 0; i < maxLength; i++) {
        const num = Math.round(Math.max(arr1[i] || 0, arr2[i] || 0));
        result.push(num > 60 ? num : 1);
      }
      return result;
    };
    const finalValues = mergeArraysWithMaxNumber(cpuValues, memoryValues);
    return finalValues;
  }, [list.length]);

  const data = list.map((item: any, index: number) => ({
    time: item.time,
    cpu: finalValues[index],
  }));

  return (
    <div className="relative h-full flex flex-col justify-center">
      {disabled ? (
        <span className="m-dt__lane-none">
          {t('Multi-tab performance overview is not available.')}
        </span>
      ) : null}
      <Sparkline
        data={data}
        valueKey="cpu"
        type="area"
        height={35}
        color={theme.series[0]}
        gradient={[
          withAlpha(theme.danger, 0.5),
          withAlpha(theme.series[0] ?? '', 0.8),
        ]}
      />
    </div>
  );
});

export default PerformanceGraph;
