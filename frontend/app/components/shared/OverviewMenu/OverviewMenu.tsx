import React from 'react';
import { SideMenuitem } from 'UI';
import { connect } from 'react-redux';
import { setActiveTab } from 'Duck/search';

interface Props {
  setActiveTab: (tab: any) => void;
  activeTab: string;
  isEnterprise: boolean;
}
function OverviewMenu(props: Props) {
  const { activeTab, isEnterprise } = props;

  return (
    <div>
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'all'}
          id="menu-manage-alerts"
          title="Sessions"
          iconName="play-circle-bold"
          onClick={() => props.setActiveTab({ type: 'all' })}
        />
      </div>
      <div className="w-full my-2" />
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'bookmark'}
          id="menu-manage-alerts"
          title={`${isEnterprise ? 'Vault' : 'Bookmarks'}`}
          iconName={ isEnterprise ? "safe" : "star" }
          onClick={() => props.setActiveTab({ type: 'bookmark' })}
        />
      </div>
      <div className="w-full my-2" />
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'notes'}
          id="menu-manage-alerts"
          title="Notes"
          iconName="stickies"
          onClick={() => props.setActiveTab({ type: 'notes' })}
        />
      </div>
    </div>
  );
}

export default connect((state: any) => ({
    activeTab: state.getIn(['search', 'activeTab', 'type']),
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
}), { setActiveTab })(OverviewMenu);
