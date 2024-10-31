import React, { useEffect, useState } from 'react';
import { Loader, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import SelectorsList from './components/SelectorsList/SelectorsList';
import { PlayerContext } from 'App/components/Session/playerContext';
import { compareJsonObjects } from 'App/utils';

import Select from 'Shared/Select';

const JUMP_OFFSET = 1000;
interface Props {
    setActiveTab: (tab: string) => void;
}

function PageInsightsPanel({ setActiveTab }: Props) {
    const { sessionStore } = useStore();
    const sessionId = sessionStore.current.sessionId;
    const loading = sessionStore.loadingSessionData;
    const events = sessionStore.visitedEvents;
    const filters = sessionStore.insightsFilters;
    const fetchSessionClickmap = sessionStore.fetchSessionClickmap;
    const host = sessionStore.host;
    const insights = sessionStore.insights;
    const urlOptions = events.map(({ url, host }: any) => ({ label: url, value: url, host }));

    const { player: Player } = React.useContext(PlayerContext)
    const markTargets = (t: any) => Player.markTargets(t)
    const defaultValue = urlOptions && urlOptions[0] ? urlOptions[0].value : '';
    const [insightsFilters, setInsightsFilters] = useState({ ...filters, url: host + defaultValue });
    const prevInsights = React.useRef<any>();

    useEffect(() => {
        markTargets(insights);
        return () => {
            markTargets(null);
        };
    }, [insights]);

    useEffect(() => {
        const changed = !compareJsonObjects(prevInsights.current, insightsFilters);
        if (!changed) { return }

        if (urlOptions && urlOptions[0]) {
            const url = urlOptions[0].value ? urlOptions[0].value : insightsFilters.url;
            Player.pause();
            markTargets(null);
            console.log(insightsFilters.url, urlOptions[0].value)
            void fetchSessionClickmap(sessionId, { ...insightsFilters, sessionId, url });
        }
        prevInsights.current = insightsFilters;
    }, [insightsFilters]);

    const onPageSelect = ({ value }: any) => {
        const event = events.find((item) => item.url === value.value);
        Player.jump(event.time + JUMP_OFFSET);
        setInsightsFilters({ ...insightsFilters, url: host + value.value });
    };

    return (
        <div className="p-4 bg-white">
            <div className="pb-3 flex items-center" style={{ maxWidth: '241px', paddingTop: '5px' }}>
                <div className="flex items-center">
                    <span className="mr-1 text-xl">Clicks</span>
                </div>
                <div
                    onClick={() => {
                        setActiveTab('');
                    }}
                    className="ml-auto flex items-center justify-center bg-white cursor-pointer"
                >
                    <Icon name="close" size="18" />
                </div>
            </div>
            <div className="mb-4 flex items-center">
                <div className="mr-2 flex-shrink-0">In Page</div>
                <Select
                    isSearchable={true}
                    right
                    placeholder="change"
                    options={urlOptions}
                    name="url"
                    defaultValue={defaultValue}
                    onChange={onPageSelect}
                    id="change-dropdown"
                    className="w-full"
                    style={{ width: '100%' }}
                />
            </div>
            <Loader loading={loading}>
                <SelectorsList />
            </Loader>
        </div>
    );
}

export default observer(PageInsightsPanel);
