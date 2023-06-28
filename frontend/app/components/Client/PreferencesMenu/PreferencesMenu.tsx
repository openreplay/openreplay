import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';
import { SideMenuitem } from 'UI';
import stl from './preferencesMenu.module.css';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';

const mapStateToProps = (state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  account: state.getIn(['user', 'account'])
});

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & RouteComponentProps & {
  activeTab: string;
};

function PreferencesMenu({ account, activeTab, history, isEnterprise }: Props) {
  const isAdmin = account.admin || account.superAdmin;

  const setTab = (tab: string) => {
    history.push(clientRoute(tab));
  };

  const AdminOnlyBadge = () => (
    <div
      className='ml-1 rounded-full bg-gray-light text-xs flex items-center px-2 color-gray-medium'
      style={{ marginTop: '', height: '20px', whiteSpace: 'nowrap' }}
    >
      Admin Only
    </div>
  );

  const menuItems = React.useMemo(() => {
    return [
      { title: 'Account', iconName: 'user-circle', tab: CLIENT_TABS.PROFILE },
      { title: 'Sessions Listing', iconName: 'play', tab: CLIENT_TABS.SESSIONS_LISTING },
      { title: 'Integrations', iconName: 'puzzle-piece', tab: CLIENT_TABS.INTEGRATIONS },
      { title: 'Metadata', iconName: 'tags', tab: CLIENT_TABS.CUSTOM_FIELDS },
      { title: 'Webhooks', iconName: 'anchor', tab: CLIENT_TABS.WEBHOOKS },
      { title: 'Projects', iconName: 'window-restore', tab: CLIENT_TABS.SITES },
      {
        title: 'Roles & Access',
        iconName: 'diagram-3',
        tab: CLIENT_TABS.MANAGE_ROLES,
        isAdminOnly: true,
        isEnterpriseOnly: true
      },
      {
        title: 'Audit',
        iconName: 'list-ul',
        tab: CLIENT_TABS.AUDIT,
        isAdminOnly: true,
        isEnterpriseOnly: true
      },
      { title: 'Team', iconName: 'users', tab: CLIENT_TABS.MANAGE_USERS, isAdminOnly: true },
      { title: 'Notifications', iconName: 'bell', tab: CLIENT_TABS.NOTIFICATIONS }
    ].reduce((acc, item) => {
      if (item.isAdminOnly && !isAdmin) {
        return acc;
      }

      if (item.isEnterpriseOnly && !isEnterprise) {
        return acc;
      }

      return [...acc, item];
    }, []);
  }, [isAdmin, isEnterprise]);

  // @ts-ignore
  return (
    <div className={cn(stl.wrapper, 'h-full overflow-y-auto pb-24')}>
      <div className={cn(stl.header, 'flex items-end')}>
        <div className={stl.label}>
          <span>Preferences</span>
        </div>
      </div>

      {menuItems.map((menuItem) => (
        <div className='mb-2' key={menuItem.title}>
          <SideMenuitem
            active={activeTab === menuItem.tab}
            title={menuItem.title}
            // @ts-ignore
            iconName={menuItem.iconName}
            onClick={() => setTab(menuItem.tab)}
            leading={menuItem.isAdminOnly ? <AdminOnlyBadge /> : undefined}
          />
        </div>
      ))}
    </div>
  );
}

export default connector(withRouter(PreferencesMenu));
