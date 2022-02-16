import React from 'react'
import { connect } from 'react-redux';
import cn from 'classnames';
import { SideMenuitem } from 'UI'
import stl from './preferencesMenu.css';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';

function PreferencesMenu({ activeTab, appearance, history, isEnterprise }) {

  const setTab = (tab) => {
    history.push(clientRoute(tab));
  }

  return (
    <div className={stl.wrapper}>
      <div className={ cn(stl.header, 'flex items-end') }>
        <div className={ stl.label }>
          <span>Preferences</span>
        </div>
      </div>
      
      <div className="mb-4">
        <SideMenuitem
          active={ activeTab === CLIENT_TABS.PROFILE }
          title="Account"
          iconName="user-circle"
          onClick={() => setTab(CLIENT_TABS.PROFILE) }
        />
      </div>

      <div className="mb-4">
        <SideMenuitem
          active={ activeTab === CLIENT_TABS.INTEGRATIONS }
          title="Integrations"
          iconName="puzzle-piece"
          onClick={() => setTab(CLIENT_TABS.INTEGRATIONS) }
        />
      </div>

      <div className="mb-4">
        <SideMenuitem
          iconName="tags"
          active={ activeTab === CLIENT_TABS.CUSTOM_FIELDS }
          onClick={ () => setTab(CLIENT_TABS.CUSTOM_FIELDS) }
          title="Metadata"
        />
      </div>


      { 
        <div className="mb-4">
          <SideMenuitem
            active={ activeTab === CLIENT_TABS.WEBHOOKS }
            title="Webhooks"
            iconName="anchor"
            onClick={() => setTab(CLIENT_TABS.WEBHOOKS) }
          />
        </div>
      }

      <div className="mb-4">
        <SideMenuitem
          active={ activeTab === CLIENT_TABS.SITES }
          title="Projects"
          iconName="window-restore"
          onClick={() => setTab(CLIENT_TABS.SITES) }
        />
      </div>

      { isEnterprise && (
        <div className="mb-4">
          <SideMenuitem
            active={ activeTab === CLIENT_TABS.MANAGE_ROLES }
            title="Roles & Access"
            iconName="diagram-3"
            onClick={() => setTab(CLIENT_TABS.MANAGE_ROLES) }
          />
        </div> 
      )}
      
      <div className="mb-4">
        <SideMenuitem
          active={ activeTab === CLIENT_TABS.MANAGE_USERS }
          title="Team"
          iconName="users"
          onClick={() => setTab(CLIENT_TABS.MANAGE_USERS) }
        />
      </div>

      <div className="mb-4">
        <SideMenuitem
          active={ activeTab === CLIENT_TABS.NOTIFICATIONS }
          title="Notifications"
          iconName="bell"
          onClick={() => setTab(CLIENT_TABS.NOTIFICATIONS) }
        />
      </div>      
    </div>
  )
}

export default connect(state => ({
  appearance: state.getIn([ 'user', 'account', 'appearance' ]),
  isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}))(withRouter(PreferencesMenu));
