import React from 'react';
import { SideMenuitem } from 'UI';
import { connect } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { sessions, fflags, withSiteId, notes, bookmarks } from 'App/routes';
import { useStore } from 'App/mstore';

interface Props {
  activeTab: string;
  isEnterprise: boolean;
}

const TabToUrlMap = {
  all: sessions() as '/sessions',
  bookmark: bookmarks() as '/bookmarks',
  notes: notes() as '/notes',
  flags: fflags() as '/feature-flags'
};

function OverviewMenu(props: Props & RouteComponentProps) {
  // @ts-ignore
  const { isEnterprise, history, match: { params: { siteId } }, location } = props;
  const { searchStore } = useStore();
  const activeTab = searchStore.activeTab.type;

  React.useEffect(() => {
    const currentLocation = location.pathname;
    const tab = Object.keys(TabToUrlMap).find((tab: keyof typeof TabToUrlMap) => currentLocation.includes(TabToUrlMap[tab]));
    if (tab && tab !== activeTab) {
      searchStore.setActiveTab({ type: tab });
    }
  }, [location.pathname]);

  return (
    <div className={'flex flex-col gap-2 w-full'}>
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'all'}
          id="menu-sessions"
          title="Sessions"
          iconName="play-circle-bold"
          onClick={() => {
            searchStore.setActiveTab({ type: 'all' });
            !location.pathname.includes(sessions()) && history.push(withSiteId(sessions(), siteId));
          }}
        />
      </div>
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'bookmark'}
          id="menu-bookmarks"
          title={`${isEnterprise ? 'Vault' : 'Bookmarks'}`}
          iconName={isEnterprise ? 'safe' : 'star'}
          onClick={() => {
            // props.setActiveTab({ type: 'bookmark' });
            !location.pathname.includes(bookmarks()) && history.push(withSiteId(bookmarks(), siteId));
          }}
        />
      </div>
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'notes'}
          id="menu-notes"
          title="Notes"
          iconName="stickies"
          onClick={() => {
            searchStore.setActiveTab({ type: 'notes' });
            !location.pathname.includes(notes()) && history.push(withSiteId(notes(), siteId));
          }}
        />
      </div>
      <div className="w-full">
        <SideMenuitem
          active={activeTab === 'flags'}
          id="menu-flags"
          title="Feature Flags"
          iconName="toggles"
          onClick={() => {
            searchStore.setActiveTab({ type: 'flags' });
            !location.pathname.includes(fflags()) && history.push(withSiteId(fflags(), siteId));
          }}
        />
      </div>
    </div>
  );
}

export default connect((state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee'
}))(withRouter(OverviewMenu));
