import { issues_types, types } from 'Types/session/issue';
import { Segmented } from 'antd';
import cn from 'classnames';
import { Angry, CircleAlert, Skull, WifiOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { memo } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { useStore } from 'App/mstore';
import { setActiveTab } from 'Duck/search';
import { Icon } from 'UI';

interface Tag {
  name: string;
  type: string;
  icon: string;
}

interface StateProps {
  activeTab: { type: string };
}

interface DispatchProps {
  setActiveTab: typeof setActiveTab;
}

type Props = StateProps & DispatchProps;

const tagIcons = {
  [types.ALL]: undefined,
  [types.JS_EXCEPTION]: <CircleAlert size={14} />,
  [types.BAD_REQUEST]: <WifiOff size={14} />,
  [types.CLICK_RAGE]: <Angry size={14} />,
  [types.CRASH]: <Skull size={14} />,
} as Record<string, any>;

const SessionTags: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { projectsStore, sessionStore } = useStore();
  const total = sessionStore.total;
  const platform = projectsStore.active?.platform || '';
  const tags = issues_types.filter(
    (tag) =>
      tag.type !== 'mouse_thrashing' &&
      (platform === 'web'
        ? tag.type !== types.TAP_RAGE
        : tag.type !== types.CLICK_RAGE)
  );
  const disable = activeTab.type === 'all' && total === 0;

  const options = tags.map((tag, i) => ({
    label: (
      <div className={'flex items-center gap-2'}>
        {tag.icon ? (
          tagIcons[tag.type] ? (
            tagIcons[tag.type]
          ) : (
            <Icon
              name={tag.icon}
              color={activeTab.type === tag.type ? 'main' : undefined}
              size="14"
              className={cn('group-hover:fill-teal')}
            />
          )
        ) : null}
        <div className={activeTab.type === tag.type ? 'text-main' : ''}>
          {tag.name}
        </div>
      </div>
    ),
    value: tag.type,
    disabled: disable && tag.type !== 'all',
  }));

  const onPick = (tabValue: string) => {
    const tab = tags.find((t) => t.type === tabValue);
    if (tab) {
      setActiveTab(tab);
    }
  };
  return (
    <div className="flex items-center">
      <Segmented
        options={options}
        value={activeTab.type}
        onChange={onPick}
        size={'small'}
      />
    </div>
  );
};

// Separate the TagItem into its own memoized component.
export const TagItem: React.FC<{
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  disabled: boolean;
}> = memo(({ isActive, onClick, label, icon, disabled }) => (
  <button
    onClick={onClick}
    className={cn(
      'transition group rounded ml-2 px-2 py-1 flex items-center uppercase text-sm hover:bg-active-blue hover:text-teal',
      {
        'bg-active-blue text-teal': isActive,
        disabled: disabled,
      }
    )}
    style={{ height: '36px' }}
  >
    {icon && (
      <Icon
        name={icon}
        color={isActive ? 'teal' : 'gray-medium'}
        size="14"
        className={cn('group-hover:fill-teal mr-2')}
      />
    )}
    <span className="leading-none font-medium">{label}</span>
  </button>
));

const mapStateToProps = (state: any): StateProps => {
  const activeTab = state.getIn(['search', 'activeTab']);

  return { activeTab };
};

const mapDispatchToProps = (dispatch: any): DispatchProps =>
  bindActionCreators(
    {
      setActiveTab,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(observer(SessionTags));
