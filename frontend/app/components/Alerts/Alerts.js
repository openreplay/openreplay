import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import AlertsList from './AlertsList';
import { SlideModal, IconButton } from 'UI';
import { init, edit, save, remove } from 'Duck/alerts';
import { fetchList as fetchWebhooks } from 'Duck/webhook';
import AlertForm from './AlertForm';
import { connect } from 'react-redux';
import { setShowAlerts } from 'Duck/dashboard';
import { EMAIL, SLACK, WEBHOOK } from 'App/constants/schedule';
import { confirm } from 'UI';

const Alerts = (props) => {
    const { webhooks, setShowAlerts } = props;
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        props.fetchWebhooks();
    }, []);

    const slackChannels = webhooks
        .filter((hook) => hook.type === SLACK)
        .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
        .toJS();
    const hooks = webhooks
        .filter((hook) => hook.type === WEBHOOK)
        .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
        .toJS();

    const saveAlert = (instance) => {
        const wasUpdating = instance.exists();
        props.save(instance).then(() => {
            if (!wasUpdating) {
                toast.success('New alert saved');
                toggleForm(null, false);
            } else {
                toast.success('Alert updated');
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
            props.remove(instance.alertId).then(() => {
                toggleForm(null, false);
            });
        }
    };

    const toggleForm = (instance, state) => {
        if (instance) {
            props.init(instance);
        }
        return setShowForm(state ? state : !showForm);
    };

    return (
        <div>
            <SlideModal
                title={
                    <div className="flex items-center">
                        <span className="mr-3">{'Alerts'}</span>
                        <IconButton circle size="small" icon="plus" outline id="add-button" onClick={() => toggleForm({}, true)} />
                    </div>
                }
                isDisplayed={true}
                onClose={() => {
                    toggleForm({}, false);
                    setShowAlerts(false);
                }}
                size="small"
                content={
                    <AlertsList
                        onEdit={(alert) => {
                            toggleForm(alert, true);
                        }}
                        onClickCreate={() => toggleForm({}, true)}
                    />
                }
                detailContent={
                    showForm && (
                        <AlertForm
                            edit={props.edit}
                            slackChannels={slackChannels}
                            webhooks={hooks}
                            onSubmit={saveAlert}
                            onClose={() => toggleForm({}, false)}
                            onDelete={onDelete}
                        />
                    )
                }
            />
        </div>
    );
};

export default connect(
    (state) => ({
        webhooks: state.getIn(['webhooks', 'list']),
        instance: state.getIn(['alerts', 'instance']),
    }),
    { init, edit, save, remove, fetchWebhooks, setShowAlerts }
)(Alerts);
