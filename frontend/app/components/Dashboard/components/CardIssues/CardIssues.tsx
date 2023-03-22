import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader, Pagination, Button } from 'UI';
// import FunnelIssuesDropdown from '../FunnelIssuesDropdown';
// import FunnelIssuesSort from '../FunnelIssuesSort';
// import FunnelIssuesList from '../FunnelIssuesList';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import CardIssueItem from './CardIssueItem';
import { useModal } from 'App/components/Modal';
import SessionsModal from '../SessionsModal';

function CardIssues() {
    const { metricStore, dashboardStore } = useStore();
    const [data, setData] = useState<any>([
        { type: 'Dead Click', source: 'some-button' },
        { type: 'Dead Click', source: 'some-button' },
        { type: 'Dead Click', source: 'some-button' },
        { type: 'Dead Click', source: 'some-button' },
    ]);
    const [loading, setLoading] = useState(false);
    const widget: any = useObserver(() => metricStore.instance);
    const isMounted = useIsMounted()
    const pageSize = data.length;
    const { showModal } = useModal();

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
                        }).map((f: any) => f.toJson())
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

    const handleClick = (issue: any) => {
        showModal(<SessionsModal list={[]} />, { right: true, width: 450 })
    }

    const filter = useObserver(() => dashboardStore.drillDownFilter);
    const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
    const debounceRequest: any = React.useCallback(debounce(fetchIssues, 1000), []);
    const depsString = JSON.stringify(widget.series);

    // useEffect(() => {
    //     debounceRequest({ ...filter, series: widget.series, page: metricStore.sessionsPage, limit: metricStore.sessionsPageSize });
    // }, [stages.length, drillDownPeriod, filter.filters, depsString, metricStore.sessionsPage]);

    return useObserver(() => (
        <div className="my-8 bg-white rounded p-4 border">
            <div className="flex justify-between">
                <h1 className="font-medium text-2xl">Issues</h1>
                <div>
                    <Button variant="text-primary">All Sessions</Button>
                </div>
            </div>

            <Loader loading={loading}>
                {data.map((item: any, index: any) => (
                    <div onClick={() => handleClick(item)} key={index}>
                        <CardIssueItem issue={item} />
                    </div>
                ))}
            </Loader>

            <div className="w-full flex items-center justify-between pt-4">
                <div className="text-disabled-text">
                Showing <span className="font-semibold">{Math.min(data.length, pageSize)}</span> out of{' '}
                <span className="font-semibold">{data.length}</span> Issues
                </div>
                <Pagination
                    page={metricStore.sessionsPage}
                    totalPages={Math.ceil(data.length / metricStore.sessionsPageSize)}
                    onPageChange={(page: any) => metricStore.updateKey('sessionsPage', page)}
                    limit={metricStore.sessionsPageSize}
                    debounceRequest={500}
                />
            </div>
        </div>
    ));
}

export default CardIssues;
