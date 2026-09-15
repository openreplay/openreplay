import React from 'react';
import Sparkline from 'Components/Charts/Sparkline';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface Props {
  list: any;
  disabled?: boolean;
}
const PerformanceGraph = React.memo((props: Props) => {
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
    <div className="relative">
      {disabled ? (
        <div className="flex justify-start">
          <div className="text-xs text-neutral-400 ps-2">
            {t('Multi-tab performance overview is not available.')}
          </div>
        </div>
      ) : null}
      <Sparkline
        data={data}
        valueKey="cpu"
        type="area"
        height={35}
        baseValue={5}
        color="#3EAAAF"
        gradient={['rgba(204, 0, 0, 0.5)', 'rgba(62, 170, 175, 0.8)']}
      />
    </div>
  );
});

export default PerformanceGraph;
