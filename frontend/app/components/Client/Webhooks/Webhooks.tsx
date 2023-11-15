import React, { useEffect } from 'react';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { Button, Loader, NoContent, Icon, Divider } from 'UI';
import WebhookForm from './WebhookForm';
import ListItem from './ListItem';
import styles from './webhooks.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { confirm } from 'UI';
import { toast } from 'react-toastify';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite'
import { IWebhook } from 'Types/webhook';

function Webhooks() {
    const { settingsStore } = useStore()
    const { webhooks, hooksLoading: loading } = settingsStore;
    const { showModal, hideModal } = useModal();

    const customWebhooks = webhooks.filter((hook) => hook.type === 'webhook');
    useEffect(() => {
        void settingsStore.fetchWebhooks();
    }, []);

    const init = (webhookInst?: Partial<IWebhook>) => {
        settingsStore.initWebhook(webhookInst);
        showModal(<WebhookForm onClose={hideModal} onDelete={removeWebhook} />, { right: true });
    };

    const removeWebhook = async (id: string) => {
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
        <div className="p-5 bg-white rounded-lg">
            <div className={cn(styles.tabHeader)}>
                <h3 className={cn(styles.tabTitle, 'text-2xl')}>{'Webhooks'}</h3>
                <Button className="ml-auto" variant="primary" onClick={() => init()}>Add Webhook</Button>
            </div>

            <div className="text-base text-disabled-text flex items-center my-3 px-5">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
              Leverage webhook notifications on alerts to trigger custom callbacks.
            </div>

            <Loader loading={loading}>
                <NoContent
                    title={
                        <div className="flex flex-col items-center justify-center">
                            <AnimatedSVG name={ICONS.NO_WEBHOOKS} size={170} />
                            <div className="text-center my-4">None added yet</div>
                        </div>
                    }
                    size="small"
                    show={customWebhooks.length === 0}
                >
                    <div className="cursor-pointer">
                        {customWebhooks.map((webhook) => (
                            <>
                              <ListItem key={webhook.webhookId} webhook={webhook} onEdit={() => init(webhook)} />
                              <Divider className="m-0" />
                            </>
                        ))}
                    </div>
                </NoContent>
            </Loader>
        </div>
    );
}

export default withPageTitle('Webhooks - OpenReplay Preferences')(observer(Webhooks));
