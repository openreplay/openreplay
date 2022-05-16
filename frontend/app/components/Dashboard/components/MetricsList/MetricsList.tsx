import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { NoContent, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { getRE } from 'App/utils';
import MetricListItem from '../MetricListItem';
import { sliceListPerPage } from 'App/utils';

interface Props { }
function MetricsList(props: Props) {
    const { metricStore } = useStore();
    const metrics = useObserver(() => metricStore.metrics);
    const metricsSearch = useObserver(() => metricStore.metricsSearch);
    const filterList = (list) => {
        const filterRE = getRE(metricsSearch, 'i');
        let _list = list.filter(w => {
            const dashbaordNames = w.dashboards.map(d => d.name).join(' ');
            return filterRE.test(w.name) || filterRE.test(w.metricType) || filterRE.test(w.owner) || filterRE.test(dashbaordNames);
        });
        return _list
    }
    const list: any = metricsSearch !== '' ? filterList(metrics) : metrics;
    const lenth = list.length;

    useEffect(() => {
        metricStore.updateKey('sessionsPage', 1);
    }, [])

    return useObserver(() => (
        <NoContent show={lenth === 0} animatedIcon="no-results">
            <div className="mt-3 border rounded bg-white">
                <div className="grid grid-cols-12 p-3 font-medium">
                    <div className="col-span-3">Title</div>
                    <div>Type</div>
                    <div className="col-span-2">Dashboards</div>
                    <div className="col-span-3">Owner</div>
                    <div>Visibility</div>
                    <div className="col-span-2">Last Modified</div>
                </div>

                {sliceListPerPage(list, metricStore.page - 1, metricStore.pageSize).map((metric: any) => (
                    <React.Fragment key={metric.metricId}>
                        <MetricListItem metric={metric} />
                    </React.Fragment>
                ))}
            </div>

            <div className="w-full flex items-center justify-center py-6">
                <Pagination
                    page={metricStore.page}
                    totalPages={Math.ceil(lenth / metricStore.pageSize)}
                    onPageChange={(page) => metricStore.updateKey('page', page)}
                    limit={metricStore.pageSize}
                    debounceRequest={100}
                />
            </div>
        </NoContent>
    ));
}

export default MetricsList;
