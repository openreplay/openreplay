import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { SideMenuitem } from 'UI';
import stl from './preferencesMenu.module.css';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';

function PreferencesMenu({ account, activeTab, history, isEnterprise }) {
  const isAdmin = account.admin || account.superAdmin;
  const setTab = (tab) => {
    history.push(clientRoute(tab));
  };

  return (
    <div className={cn(stl.wrapper, 'h-full overflow-y-auto pb-24')}>
      <div className={cn(stl.header, 'flex items-end')}>
        <div className={stl.label}>
          <span>Preferences</span>
        </div>
      </div>

      <div className="mb-2">
        <SideMenuitem
          active={activeTab === CLIENT_TABS.PROFILE}
          title="Account"
          iconName="user-circle"
          onClick={() => setTab(CLIENT_TABS.PROFILE)}
        />
      </div>

      <div className="mb-2">
        <SideMenuitem
          active={activeTab === CLIENT_TABS.INTEGRATIONS}
          title="Integrations"
          iconName="puzzle-piece"
          onClick={() => setTab(CLIENT_TABS.INTEGRATIONS)}
        />
      </div>

      <div className="mb-2">
        <SideMenuitem
          iconName="tags"
          active={activeTab === CLIENT_TABS.CUSTOM_FIELDS}
          onClick={() => setTab(CLIENT_TABS.CUSTOM_FIELDS)}
          title="Metadata"
        />
      </div>

      {
        <div className="mb-2">
          <SideMenuitem
            active={activeTab === CLIENT_TABS.WEBHOOKS}
            title="Webhooks"
            iconName="anchor"
            onClick={() => setTab(CLIENT_TABS.WEBHOOKS)}
          />
        </div>
      }

      <div className="mb-2">
        <SideMenuitem
          active={activeTab === CLIENT_TABS.SITES}
          title="Projects"
          iconName="window-restore"
          onClick={() => setTab(CLIENT_TABS.SITES)}
        />
      </div>

      {isEnterprise && isAdmin && (
        <div className="mb-2 relative">
          <SideMenuitem
            active={activeTab === CLIENT_TABS.MANAGE_ROLES}
            title="Roles & Access"
            iconName="diagram-3"
            onClick={() => setTab(CLIENT_TABS.MANAGE_ROLES)}
            leading={<AdminOnlyBadge />}
          />
        </div>
      )}

      {isEnterprise && isAdmin && (
        <div className="mb-2 relative">
          <SideMenuitem
            active={activeTab === CLIENT_TABS.AUDIT}
            title="Audit"
            iconName="list-ul"
            onClick={() => setTab(CLIENT_TABS.AUDIT)}
            leading={<AdminOnlyBadge />}
          />
        </div>
      )}

      {isAdmin && (
        <div className="mb-2 relative">
          <SideMenuitem
            active={activeTab === CLIENT_TABS.MANAGE_USERS}
            title="Team"
            iconName="users"
            onClick={() => setTab(CLIENT_TABS.MANAGE_USERS)}
            leading={<AdminOnlyBadge />}
          />
        </div>
      )}

      <div className="mb-2">
        <SideMenuitem
          active={activeTab === CLIENT_TABS.NOTIFICATIONS}
          title="Notifications"
          iconName="bell"
          onClick={() => setTab(CLIENT_TABS.NOTIFICATIONS)}
        />
      </div>
    </div>
  );
}

export default connect((state) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  account: state.getIn(['user', 'account']),
}))(withRouter(PreferencesMenu));

function AdminOnlyBadge() {
  return (
    <div
      className="ml-1 rounded-full bg-gray-light text-xs flex items-center px-2 color-gray-medium"
      style={{ marginTop: '', height: '20px', whiteSpace: 'nowrap' }}
    >
      Admin Only
    </div>
  );
}
