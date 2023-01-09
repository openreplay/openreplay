import React, { useEffect } from 'react';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { Button, Loader, NoContent, Icon } from 'UI';
import WebhookForm from './WebhookForm';
import ListItem from './ListItem';
import styles from './webhooks.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { confirm } from 'UI';
import { toast } from 'react-toastify';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite'

function Webhooks() {
    const { settingsStore } = useStore()
    const { webhooks, hooksLoading: loading } = settingsStore;
    const { showModal, hideModal } = useModal();

    const noSlackWebhooks = webhooks.filter((hook) => hook.type === 'webhook');
    useEffect(() => {
        void settingsStore.fetchWebhooks();
    }, []);

    const init = (v) => {
        settingsStore.initWebhook(v);
        showModal(<WebhookForm onClose={hideModal} onDelete={removeWebhook} />);
    };

    const removeWebhook = async (id) => {
        if (
            await confirm({
                header: 'Confirm',
                confirmButton: 'Yes, delete',
                confirmation: `Are you sure you want to remove this webhook?`,
            })
        ) {
            settingsStore.removeWebhook(id).then(() => {
                toast.success('Webhook removed successfully');
            });
            hideModal();
        }
    };

    return (
        <div>
            <div className={cn(styles.tabHeader, 'px-5 pt-5')}>
                <h3 className={cn(styles.tabTitle, 'text-2xl')}>{'Webhooks'}</h3>
                <Button className="ml-auto" variant="primary" onClick={() => init()}>Add Webhook</Button>
            </div>

            <div className="text-base text-disabled-text flex items-center my-3 px-5">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                Leverage webhooks to push OpenReplay data to other systems.
            </div>

            <Loader loading={loading}>
                <NoContent
                    title={
                        <div className="flex flex-col items-center justify-center">
                            <AnimatedSVG name={ICONS.NO_WEBHOOKS} size={80} />
                            <div className="text-center text-gray-600 my-4">None added yet</div>
                        </div>
                    }
                    size="small"
                    show={noSlackWebhooks.length === 0}
                >
                    <div className="cursor-pointer">
                        {noSlackWebhooks.map((webhook) => (
                            <ListItem key={webhook.key} webhook={webhook} onEdit={() => init(webhook)} />
                        ))}
                    </div>
                </NoContent>
            </Loader>
        </div>
    );
}

export default withPageTitle('Webhooks - OpenReplay Preferences')(observer(Webhooks));
