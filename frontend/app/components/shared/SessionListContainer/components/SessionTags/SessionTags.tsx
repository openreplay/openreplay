import React from 'react';
import { setActiveTab } from 'Duck/search';
import { connect } from 'react-redux';
import { issues_types } from 'Types/session/issue';
import { Icon } from 'UI';
import cn from 'classnames';

interface Props {
    setActiveTab: typeof setActiveTab;
    activeTab: any;
    tags: any;
    total: number;
}
function SessionTags(props: Props) {
    const { activeTab, tags, total } = props;
    const disable = activeTab.type === 'all' && total === 0;

    return (
        <div className="flex items-center">
            {tags &&
                tags.map((tag: any, index: any) => (
                    <div key={index}>
                        <TagItem
                            onClick={() => props.setActiveTab(tag)}
                            label={tag.name}
                            isActive={activeTab.type === tag.type}
                            icon={tag.icon}
                            disabled={disable && tag.type !== 'all'}
                        />
                    </div>
                ))}
        </div>
    );
}

export default connect(
    (state: any) => {
        const isEnterprise = state.getIn(['user', 'account', 'edition']) === 'ee';
        return {
            activeTab: state.getIn(['search', 'activeTab']),
            tags: issues_types.filter((tag: any) => (isEnterprise ? tag.type !== 'bookmark' : tag.type !== 'vault')),
            total: state.getIn(['sessions', 'total']) || 0,
        };
    },
    {
        setActiveTab,
    }
)(SessionTags);

function TagItem({ isActive, onClick, label, icon = '', disabled = false }: any) {
    return (
        <div>
            <button
                onClick={onClick}
                className={cn('transition group rounded ml-2 px-2 py-1 flex items-center uppercase text-sm hover:bg-active-blue hover:text-teal', {
                    'bg-active-blue text-teal': isActive,
                    disabled: disabled,
                })}
                style={{ height: '36px' }}
            >
                {icon && <Icon name={icon} color={isActive ? 'teal' : 'gray-medium'} size="14" className={cn('group-hover:fill-teal mr-2')} />}
                <span className="leading-none font-medium">{label}</span>
            </button>
        </div>
    );
}
