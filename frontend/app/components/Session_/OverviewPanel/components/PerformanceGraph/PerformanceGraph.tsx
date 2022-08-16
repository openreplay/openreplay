import React from 'react';
import { connectPlayer } from 'App/player';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    list: any;
}
const PerformanceGraph = React.memo((props: Props) => {
    const { list } = props;

    const finalValues = React.useMemo(() => {
        const cpuMax = list.reduce((acc: number, item: any) => {
            return Math.max(acc, item.cpu);
        }, 0);
        const cpuMin = list.reduce((acc: number, item: any) => {
            return Math.min(acc, item.cpu);
        }, Infinity);

        const memoryMin = list.reduce((acc: number, item: any) => {
            return Math.min(acc, item.usedHeap);
        }, Infinity);
        const memoryMax = list.reduce((acc: number, item: any) => {
            return Math.max(acc, item.usedHeap);
        }, 0);

        const convertToPercentage = (val: number, max: number, min: number) => {
            return ((val - min) / (max - min)) * 100;
        };
        const cpuValues = list.map((item: any) => convertToPercentage(item.cpu, cpuMax, cpuMin));
        const memoryValues = list.map((item: any) => convertToPercentage(item.usedHeap, memoryMax, memoryMin));
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
    }, []);

    const data = list.map((item: any, index: number) => {
        return {
            time: item.time,
            cpu: finalValues[index],
        };
    });

    return (
        <ResponsiveContainer height={35}>
            <AreaChart
                data={data}
                margin={{
                    top: 0,
                    right: 0,
                    left: 0,
                    bottom: 0,
                }}
            >
                <defs>
                    <linearGradient id="cpuGradientTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="30%" stopColor="#CC0000" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#3EAAAF" stopOpacity={0.8} />
                    </linearGradient>
                </defs>
                {/* <Tooltip filterNull={false} /> */}
                <Area
                    dataKey="cpu"
                    baseValue={5}
                    type="monotone"
                    stroke="none"
                    activeDot={false}
                    fill="url(#cpuGradientTimeline)"
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
});

export default PerformanceGraph;
