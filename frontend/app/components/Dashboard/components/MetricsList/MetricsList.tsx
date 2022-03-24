import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { Icon, NoContent, Label, Link } from 'UI';
import { useDashboardStore } from '../../store/store';

interface Props { }
function MetricsList(props: Props) {
    const store: any = useDashboardStore();
    const widgets = store.widgets;
    const lenth = widgets.length;

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

                {widgets.map((metric: any) => (
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
        </NoContent>
    ));
}

export default MetricsList;