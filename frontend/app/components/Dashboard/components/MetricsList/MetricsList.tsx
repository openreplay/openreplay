import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { getRE } from 'App/utils';
import MetricListItem from '../MetricListItem';

interface Props { }
function MetricsList(props: Props) {
    const { metricStore } = useStore();
    const metrics = useObserver(() => metricStore.metrics);
    const lenth = metrics.length;
    
    const metricsSearch = useObserver(() => metricStore.metricsSearch);
    const filterRE = getRE(metricsSearch, 'i');
    const list = metrics.filter(w => filterRE.test(w.name));


    return useObserver(() => (
        <NoContent show={lenth === 0} icon="exclamation-circle">
            <div className="mt-3 border rounded bg-white">
                <div className="grid grid-cols-7 p-3 font-medium">
                    <div className="col-span-2">Title</div>
                    <div>Type</div>
                    <div>Dashboards</div>
                    <div>Owner</div>
                    <div>Visibility & Edit Access</div>
                    <div>Last Modified</div>
                </div>

                {list.map((metric: any) => (
                    <MetricListItem metric={metric} />
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