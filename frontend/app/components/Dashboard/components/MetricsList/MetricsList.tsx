import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Icon, NoContent, Label, Link, Pagination } from 'UI';
import { useDashboardStore } from '../../store/store';
import { getRE } from 'App/utils';

interface Props { }
function MetricsList(props: Props) {
    const store: any = useDashboardStore();
    const widgets = store.widgets;
    const lenth = widgets.length;
    const currentPage = useObserver(() => store.metricsPage);
    const metricsSearch = useObserver(() => store.metricsSearch);

    const filterRE = getRE(metricsSearch, 'i');
    const list = widgets.filter(w => filterRE.test(w.name))
    
    const totalPages = list.length;
    const pageSize = store.metricsPageSize;
    const start = (currentPage - 1) * pageSize;
    const end = currentPage * pageSize;

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

                {list.slice(start, end).map((metric: any) => (
                    <div className="grid grid-cols-7 p-3 border-t select-none">
                        <div className="col-span-2">
                            <Link to="/dashboard/metrics/create" className="link">
                                {metric.name}
                            </Link>
                        </div>
                        <div><Label className="capitalize">{metric.metricType}</Label></div>
                        <div>Dashboards</div>
                        <div>{metric.owner}</div>
                        <div>
                            {metric.isPrivate ? (
                                <div className="flex items-center">
                                    <Icon name="person-fill" className="mr-2" />
                                    <span>Private</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <Icon name="user-friends" className="mr-2" />
                                    <span>Team</span>
                                </div>
                            )}
                        </div>
                        <div>Last Modified</div>
                    </div>
                ))}
            </div>

            <div className="w-full flex items-center justify-center py-6">
                <Pagination
                    page={currentPage}
                    totalPages={Math.ceil(totalPages / pageSize)}
                    onPageChange={(page) => store.updateKey('metricsPage', page)}
                    limit={pageSize}
                    debounceRequest={100}
                />
            </div>
        </NoContent>
    ));
}

export default MetricsList;