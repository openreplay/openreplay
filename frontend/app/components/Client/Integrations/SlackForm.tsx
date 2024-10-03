import React, { useEffect } from 'react';
import SlackChannelList from './SlackChannelList/SlackChannelList';
import SlackAddForm from './SlackAddForm';
import { Button } from 'UI';
import { observer } from 'mobx-react-lite'
import { useStore } from 'App/mstore'

const SlackForm = () => {
    const { integrationsStore } = useStore();
    const init = integrationsStore.slack.init;
    const fetchList = integrationsStore.slack.fetchIntegrations;
    const [active, setActive] = React.useState(false);

    const onEdit = () => {
        setActive(true);
    };

    const onNew = () => {
        setActive(true);
        init({});
    }

    useEffect(() => {
        void fetchList();
    }, []);

    return (
        <div className="bg-white h-screen overflow-y-auto flex items-start" style={{ width: active ? '700px' : '350px' }}>
            {active && (
                <div className="border-r h-full" style={{ width: '350px' }}>
                    <SlackAddForm onClose={() => setActive(false)} />
                </div>
            )}
            <div className="shrink-0" style={{ width: '350px' }}>
                <div className="flex items-center p-5">
                    <h3 className="text-2xl mr-3">Slack</h3>
                    <Button rounded={true} icon="plus" iconSize={24} variant="outline" onClick={onNew}/>
                </div>
                <SlackChannelList onEdit={onEdit} />
            </div>
        </div>
    );
};

SlackForm.displayName = 'SlackForm';

export default observer(SlackForm);