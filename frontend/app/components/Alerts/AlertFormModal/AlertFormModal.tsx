import React, { useEffect, useState } from 'react';
import { SlideModal } from 'UI';
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import AlertForm from '../AlertForm';
import { SLACK, TEAMS, WEBHOOK } from 'App/constants/schedule';
import { confirm } from 'UI';

interface Select {
    label: string;
    value: string | number
}


interface Props {
    showModal?: boolean;
    metricId?: number;
    onClose?: () => void;
}
function AlertFormModal(props: Props) {
    const { alertsStore, settingsStore } = useStore()
    const { metricId = null, showModal = false } = props;
    const [showForm, setShowForm] = useState(false);
    const webhooks = settingsStore.webhooks
    useEffect(() => {
        settingsStore.fetchWebhooks();
    }, []);


    const slackChannels: Select[] = []
    const hooks: Select[] = []
    const msTeamsChannels: Select[] = []

    webhooks.forEach((hook) => {
        const option = { value: hook.webhookId, label: hook.name }
        if (hook.type === SLACK) {
            slackChannels.push(option)
        }
        if (hook.type === WEBHOOK) {
            hooks.push(option)
        }
        if (hook.type === TEAMS) {
            msTeamsChannels.push(option)
        }
    })

    const saveAlert = (instance) => {
        const wasUpdating = instance.exists();
        alertsStore.save(instance).then(() => {
            if (!wasUpdating) {
                toggleForm(null, false);
            }
            if (props.onClose) {
                props.onClose();
            }
        });
    };

    const onDelete = async (instance) => {
        if (
            await confirm({
                header: 'Confirm',
                confirmButton: 'Yes, delete',
                confirmation: `Are you sure you want to permanently delete this alert?`,
            })
        ) {
            alertsStore.remove(instance.alertId).then(() => {
                toggleForm(null, false);
            });
        }
    };

    const toggleForm = (instance, state) => {
        if (instance) {
            alertsStore.init(instance);
        }
        return setShowForm(state ? state : !showForm);
    };

    return (
        <SlideModal
            title={
                <div className="flex items-center">
                    <span className="m-3">{'Create Alert'}</span>
                </div>
            }
            isDisplayed={showModal}
            onClose={props.onClose}
            size="medium"
            content={
                showModal && (
                    <AlertForm
                        metricId={metricId}
                        edit={alertsStore.edit}
                        slackChannels={slackChannels}
                        msTeamsChannels={msTeamsChannels}
                        webhooks={hooks}
                        onSubmit={saveAlert}
                        onClose={props.onClose}
                        onDelete={onDelete}
                        style={{ width: '580px', height: '100vh - 200px' }}
                    />
                )
            }
        />
    );
}

export default observer(AlertFormModal);
