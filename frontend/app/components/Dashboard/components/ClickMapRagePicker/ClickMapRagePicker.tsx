import React from 'react';
import { Checkbox } from "UI";
import { Button } from 'antd'
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function ClickMapRagePicker() {
    const { metricStore, dashboardStore } = useStore();

    const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        metricStore.setClickMapsRage(e.target.checked)
    }

    const refreshHeatmapSession = async () => {
        metricStore.instance.updateKey('data', { sessionId: null, domURL: [] })
        await dashboardStore.fetchMetricChartData(
          metricStore.instance,
          {...metricStore.instance.toJson() },
          false,
          dashboardStore.period)
        metricStore.instance.updateKey('hasChanged', true)
    }

    React.useEffect(() => {
        return () => {
            metricStore.setClickMapsRage(false)
        }
    }, [])

    return (
        <div className="mr-4 flex items-center gap-2 cursor-pointer">
            <Checkbox
                onChange={onToggle}
                label="Include rage clicks"
            />

            <Button size={'small'} onClick={refreshHeatmapSession}>Get new session</Button>
        </div>
    );
}

export default observer(ClickMapRagePicker);