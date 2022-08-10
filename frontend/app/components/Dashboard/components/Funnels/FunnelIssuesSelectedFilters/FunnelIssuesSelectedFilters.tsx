import React from 'react';
import { Icon } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props {
    removeSelectedValue: (value: string) => void;
}
function FunnelIssuesSelectedFilters(props: Props) {
    const { funnelStore } = useStore();
    const issuesFilter = useObserver(() => funnelStore.issuesFilter);
    const { removeSelectedValue } = props;

    return (
        <div className="flex items-center flex-wrap">
            {issuesFilter.map((option, index) => (
                <div key={index} className="transition-all ml-2 mb-2 flex items-center border rounded-2xl bg-white select-none overflow-hidden">
                    <span className="pl-3 color-gray-dark">{option.label}</span>
                    <button className="ml-1 hover:bg-active-blue px-2 py-2" onClick={() => removeSelectedValue(option.value)}>
                        <Icon name="close"/>
                    </button>
                </div>
            ))}
        </div>
    );
}

export default FunnelIssuesSelectedFilters;