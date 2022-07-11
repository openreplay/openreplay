import React from 'react';
import { setActiveTab } from 'Duck/search';
import { connect } from 'react-redux';
import { issues_types as tags } from 'Types/session/issue';
import { Icon } from 'UI';
import cn from 'classnames';

interface Props {
    setActiveTab: typeof setActiveTab;
    activeTab: any;
}
function SessionTags(props: Props) {
    const { setActiveTab, activeTab } = props;
    console.log('activeTab', activeTab)
    return (
        <div className="flex items-center">
            <TagItem onClick={() => props.setActiveTab('all')} label={'All'} isActive={activeTab.type === 'all'} />
            {tags &&
                tags.map((tag: any, index: any) => (
                    <div key={index}>
                        <TagItem onClick={() => props.setActiveTab(tag)} label={tag.name} isActive={activeTab.type === tag.type} icon={tag.icon} />
                        {/* <button
                            onClick={() => props.setActiveTab(tag.id)}
                            className="transition group rounded ml-2 px-2 py-1 flex items-center bg-active-blue color-teal uppercase text-sm hover:bg-teal hover:text-white"
                        >
                            <Icon name={tag.icon} color="teal" size="15" className="group-hover:fill-white" />
                            <span className="ml-2">{tag.name}</span>
                        </button> */}
                    </div>
                ))}
            <TagItem onClick={() => props.setActiveTab('all')} label={'Vault'} isActive={false} icon="safe" />
        </div>
    );
}

export default connect(
    (state: any) => ({
        activeTab: state.getIn(['search', 'activeTab']),
    }),
    {
        setActiveTab,
    }
)(SessionTags);

function TagItem({ isActive, onClick, label, icon = '' }: any) {
    return (
        <div>
            <button
                onClick={onClick}
                className={cn('transition group rounded ml-2 px-2 py-1 flex items-center uppercase text-sm hover:bg-teal hover:text-white', {
                    'bg-teal text-white': isActive,
                    'bg-active-blue color-teal': !isActive,
                })}
            >
                {icon && <Icon name={icon} color="teal" size="15" className={cn("group-hover:fill-white mr-2", { 'fill-white': isActive })} />}
                <span>{label}</span>
            </button>
        </div>
    );
}
