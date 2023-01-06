import React, { useEffect, useState } from 'react';
import { SlideModal } from 'UI';
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import { fetchList as fetchWebhooks } from 'Duck/webhook';
import AlertForm from '../AlertForm';
import { connect } from 'react-redux';
import { setShowAlerts } from 'Duck/dashboard';
import { SLACK, WEBHOOK } from 'App/constants/schedule';
import { confirm } from 'UI';

interface Props {
    showModal?: boolean;
    metricId?: number;
    onClose?: () => void;
    webhooks: any;
    fetchWebhooks: Function;
}
function AlertFormModal(props: Props) {
    const { alertsStore } = useStore()
    const { metricId = null, showModal = false, webhooks } = props;
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        props.fetchWebhooks();
    }, []);

    const slackChannels = webhooks
        .filter((hook) => hook.type === SLACK)
        .map(({ webhookId, name }) => ({ value: webhookId, text: name }))
        .toJS();
    const hooks = webhooks
        .filter((hook) => hook.type === WEBHOOK)
        .map(({ webhookId, name }) => ({ value: webhookId, text: name }))
        .toJS();

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
                    <span className="mr-3">{'Create Alert'}</span>
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

export default connect(
    (state) => ({
        webhooks: state.getIn(['webhooks', 'list']),
    }),
    { fetchWebhooks, setShowAlerts }
)(observer(AlertFormModal));
