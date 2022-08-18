import React from 'react';
import { Button, PageTitle, Icon } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { connect } from 'react-redux';
import { init, edit, save, remove } from 'Duck/alerts';
import { confirm } from 'UI';
import { toast } from 'react-toastify';

import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';

interface IAlertsView {
    siteId: string;
    init: (instance?: Alert) => any;
    save: (instance: Alert) => Promise<any>;
    remove: (alertId: string) => Promise<any>;
}

function AlertsView({ siteId, remove, save, init }: IAlertsView) {
    
    const onDelete = async (instance: Alert) => {
        if (
            await confirm({
                header: 'Confirm',
                confirmButton: 'Yes, delete',
                confirmation: `Are you sure you want to permanently delete this alert?`,
            })
        ) {
            remove(instance.alertId).then(() => {
                // toggleForm(null, false);
            });
        }
    };
    const onSave = (instance: Alert) => {
        const wasUpdating = instance.exists();
        save(instance).then(() => {
            if (!wasUpdating) {
                toast.success('New alert saved');
                // toggleForm(null, false);
            } else {
                toast.success('Alert updated');
            }
        });
    };

    return (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 px-6 border">
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Dashboards" />
                </div>
                <Button variant="primary" onClick={null}>Create</Button>
                <div className="ml-auto w-1/4" style={{ minWidth: 300 }}>
                    <AlertsSearch />
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                A dashboard is a custom visualization using your OpenReplay data.
            </div>
            <AlertsList siteId={siteId} onSave={onSave} onDelete={onDelete} init={init} />
        </div>
    );
}

// @ts-ignore
const Container = connect(null, { init, edit, save, remove })(AlertsView);

export default withPageTitle('Alerts - OpenReplay')(Container);
