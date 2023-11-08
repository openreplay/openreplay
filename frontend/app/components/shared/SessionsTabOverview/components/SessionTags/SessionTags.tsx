import React, { memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setActiveTab } from 'Duck/search';
import { issues_types, types } from 'Types/session/issue';
import { Icon } from 'UI';
import cn from 'classnames';

interface Tag {
  name: string;
  type: string;
  icon: string;
}

interface StateProps {
  activeTab: { type: string };
  tags: Tag[];
  total: number;
}

interface DispatchProps {
  setActiveTab: typeof setActiveTab;
}

type Props = StateProps & DispatchProps;

const SessionTags: React.FC<Props> = memo(({ activeTab, tags, total, setActiveTab }) => {
  const disable = activeTab.type === 'all' && total === 0;

  return (
    <div className='flex items-center'>
      {tags.map((tag, index) => (
        <TagItem
          key={index} // Consider using a unique identifier instead of index if available.
          onClick={() => setActiveTab(tag)}
          label={tag.name}
          isActive={activeTab.type === tag.type}
          icon={tag.icon}
          disabled={disable && tag.type !== 'all'}
        />
      ))}
    </div>
  );
});

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
    className={cn('transition group rounded ml-2 px-2 py-1 flex items-center uppercase text-sm hover:bg-active-blue hover:text-teal', {
      'bg-active-blue text-teal': isActive,
      disabled: disabled
    })}
    style={{ height: '36px' }}
  >
    {icon && (
      <Icon
        name={icon}
        color={isActive ? 'teal' : 'gray-medium'}
        size='14'
        className={cn('group-hover:fill-teal mr-2')}
      />
    )}
    <span className='leading-none font-medium'>{label}</span>
  </button>
));

const mapStateToProps = (state: any): StateProps => {
  const platform = state.getIn(['site', 'active'])?.platform || '';
  const activeTab = state.getIn(['search', 'activeTab']);
  const filteredTags = issues_types.filter(tag =>
    tag.type !== 'mouse_thrashing' &&
    (platform === 'web' ? tag.type !== types.TAP_RAGE : tag.type !== types.CLICK_RAGE)
  );
  const total = state.getIn(['sessions', 'total']) || 0;

  return { activeTab, tags: filteredTags, total };
};

const mapDispatchToProps = (dispatch: any): DispatchProps => bindActionCreators({
  setActiveTab
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(SessionTags);
