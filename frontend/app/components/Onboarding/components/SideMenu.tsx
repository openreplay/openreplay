import React from 'react';
import stl from './sideMenu.module.css';
import cn from 'classnames';
import { SideMenuitem } from 'UI';
import { OB_TABS, onboarding as onboardingRoute } from 'App/routes';
import OnboardingMenu from './OnboardingMenu/OnboardingMenu';
import { withRouter } from 'react-router';

interface Props {
  activeTab: string;
  onClick: (tab: string) => void;
}
function SideMenu(props: Props) {
  const { activeTab } = props;
  return (
    <div className="w-full">
      <div className={cn(stl.header, 'flex items-center')}>
        <div className={stl.label}>
          <span>PROJECT SETUP</span>
        </div>
      </div>

      <SideMenuitem
        title="Setup OpenReplay"
        iconName="tools"
        active={activeTab === OB_TABS.INSTALLING}
        onClick={() => props.onClick(OB_TABS.INSTALLING)}
      />
      <SideMenuitem
        title="Identify Users"
        iconName="person-border"
        active={activeTab === OB_TABS.IDENTIFY_USERS}
        onClick={() => props.onClick(OB_TABS.IDENTIFY_USERS)}
      />
      <SideMenuitem
        title="Invite Collaborators"
        iconName="people"
        active={activeTab === OB_TABS.MANAGE_USERS}
        onClick={() => props.onClick(OB_TABS.MANAGE_USERS)}
      />
      <SideMenuitem
        title="Integrations"
        iconName="plug"
        active={activeTab === OB_TABS.INTEGRATIONS}
        onClick={() => props.onClick(OB_TABS.INTEGRATIONS)}
      />

      <div className={cn(stl.divider, 'my-4')} />

      <div className={cn(stl.header, 'flex items-center')}>
        <div className={stl.label}>
          <span>Help</span>
        </div>
      </div>

      <SideMenuitem
        title="Documentation"
        iconName="journal-code"
        onClick={() => window.open('https://docs.openreplay.com', '_blank')}
      />

      <SideMenuitem
        title="Report Issue"
        iconName="github"
        onClick={() => window.open('https://github.com/openreplay/openreplay/issues', '_blank')}
      />
    </div>
  );
}

export default SideMenu;
