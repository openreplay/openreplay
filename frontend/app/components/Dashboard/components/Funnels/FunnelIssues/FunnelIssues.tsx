import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import FunnelIssuesDropdown from '../FunnelIssuesDropdown';
import FunnelIssuesSort from '../FunnelIssuesSort';
import FunnelIssuesList from '../FunnelIssuesList';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';

function FunnelIssues() {
    const { metricStore, dashboardStore } = useStore();
    const [data, setData] = useState<any>({ issues: [] });
    const [loading, setLoading] = useState(false);
    const widget: any = useObserver(() => metricStore.instance);
    const funnel = useObserver(() => widget.data.funnel || { stages: [] });
    const stages = useObserver(() => funnel.stages.filter((stage: any) => stage.isActive));
    const isMounted = useIsMounted()

    const fetchIssues = (filter: any) => {
        if (!isMounted()) return;
        setLoading(true)
        
        const newFilter = {
            ...filter,
            series: filter.series.map((item: any) => {
                return {
                    ...item,
                    filter: {
                        ...item.filter,
                        filters: item.filter.filters.filter((filter: any, index: any) => {
                            const stage = widget.data.funnel.stages[index];
                            return stage &&stage.isActive
                        })
                    }
                }
            }),
        }
        widget.fetchIssues(newFilter).then((res: any) => {
            setData(res)
        }).finally(() => {
            setLoading(false)
        });
    }

    const filter = useObserver(() => dashboardStore.drillDownFilter);
    const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
    const debounceRequest: any = React.useCallback(debounce(fetchIssues, 1000), []);
    const depsString = JSON.stringify(widget.series);

    useEffect(() => {
        debounceRequest({ ...filter, series: widget.toJsonDrilldown(), page: metricStore.sessionsPage, limit: metricStore.sessionsPageSize });
    }, [stages.length, drillDownPeriod, filter.filters, depsString, metricStore.sessionsPage]);

    return useObserver(() => (
        <div className="my-8 bg-white rounded p-4 border">
            <div className="flex">
                <h1 className="font-medium text-2xl">Most significant issues <span className="font-normal">identified in this funnel</span></h1>
            </div>
            <div className="my-6 flex justify-between items-start">
                <FunnelIssuesDropdown />
                <div className="flex-shrink-0">
                    <FunnelIssuesSort />
                </div>
            </div>
            <Loader loading={loading}>
                <FunnelIssuesList issues={data.issues} />
            </Loader>
        </div>
    ));
}

export default FunnelIssues;
