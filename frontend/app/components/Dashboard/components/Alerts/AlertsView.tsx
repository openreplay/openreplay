import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { connect } from 'react-redux';
import { init } from 'Duck/alerts';
import { withSiteId, alertCreate } from 'App/routes';

import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';

interface IAlertsView {
    siteId: string;
    init: (instance?: Alert) => any;
}

function AlertsView({ siteId, init }: IAlertsView) {
    return (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Alerts" />
                </div>
                <div className="ml-auto flex items-center">
                    <Link to={withSiteId(alertCreate(), siteId)}><Button variant="primary" onClick={null}>Create</Button></Link>
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <AlertsSearch />
                    </div>
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center px-6">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                Alerts helps your team stay up to date with the activity on your app.
            </div>
            <AlertsList siteId={siteId} init={init} />
        </div>
    );
}

// @ts-ignore
const Container = connect(null, { init })(AlertsView);

export default withPageTitle('Alerts - OpenReplay')(Container);
