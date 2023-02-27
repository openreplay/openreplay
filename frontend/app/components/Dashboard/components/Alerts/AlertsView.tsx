import React, { useEffect } from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { withSiteId, alertCreate } from 'App/routes';

import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';
import { useHistory } from 'react-router';
import { useStore } from 'App/mstore';

interface IAlertsView {
    siteId: string;
}

function AlertsView({ siteId }: IAlertsView) {
    const history = useHistory();
    const { alertsStore } = useStore();

    
    useEffect(() => {
        const unmount = history.listen((location) => {
            if (!location.pathname.includes('/alert')) {
                alertsStore.updateKey('page', 1);
            }
        });
        return unmount;
      }, [history]);
    return (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Alerts" />
                </div>
                <div className="ml-auto flex items-center">
                    <Link to={withSiteId(alertCreate(), siteId)}><Button variant="primary">Create Alert</Button></Link>
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <AlertsSearch />
                    </div>
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center px-6">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                Alerts helps your team stay up to date with the activity on your app.
            </div>
            <AlertsList siteId={siteId} />
        </div>
    );
}

export default withPageTitle('Alerts - OpenReplay')(AlertsView);
