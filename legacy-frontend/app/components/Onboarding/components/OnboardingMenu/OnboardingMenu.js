import React from 'react';
import { Icon, SideMenuitem } from 'UI';
import cn from 'classnames';
import stl from './onboardingMenu.module.css';
import { OB_TABS, onboarding as onboardingRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import * as routes from '../../../../routes';

const withSiteId = routes.withSiteId;

const MENU_ITEMS = [
  OB_TABS.INSTALLING,
  OB_TABS.IDENTIFY_USERS,
  OB_TABS.MANAGE_USERS,
  OB_TABS.INTEGRATIONS,
];

const Item = ({ icon, text, completed, active, onClick }) => (
  <div
    className={cn('cursor-pointer', stl.stepWrapper, {
      [stl.completed]: completed,
      [stl.active]: active,
    })}
    onClick={onClick}
  >
    <div className={stl.verticleLine} />
    <div className={cn('flex', stl.step)}>
      <div
        className={cn(
          'h-6 w-6 mr-3 rounded-full flex items-center justify-center',
          stl.iconWrapper,
          { 'bg-gray-light': !active || !completed }
        )}
      >
        {/* {completed && <Icon name={icon} color={active ? 'white' : 'gray-medium'} size="18" />} */}
      </div>
      <div className="color-gray-dark">{text}</div>
    </div>
  </div>
);

const OnboardingMenu = (props) => {
  const {
    match: {
      params: { activeTab, siteId },
    },
    history,
  } = props;
  const activeIndex = MENU_ITEMS.findIndex((i) => i === activeTab);

  const setTab = (tab) => {
    history.push(withSiteId(onboardingRoute(tab), siteId));
  };

  return (
    <div>
        <SideMenuitem title="Install OpenReplay" iconName="tools" active />
        <SideMenuitem title="Identify Users" iconName="tools" active />
        <SideMenuitem title="Invite Collaborators" iconName="tools" active />
        <SideMenuitem title="Integrations" iconName="tools" active />
      
        <>
          <Item
            icon="check"
            text="Install OpenReplay"
            completed={activeIndex >= 0}
            active={activeIndex === 0}
            onClick={() => setTab(MENU_ITEMS[0])}
          />
          <Item
            icon="check"
            text="Identify Users"
            completed={activeIndex >= 1}
            active={activeIndex === 1}
            onClick={() => setTab(MENU_ITEMS[1])}
          />
          <Item
            icon="check"
            text="Invite Collaborators"
            completed={activeIndex >= 2}
            active={activeIndex === 2}
            onClick={() => setTab(MENU_ITEMS[2])}
          />
          <Item
            icon="check"
            text="Integrations"
            completed={activeIndex >= 3}
            active={activeIndex === 3}
            onClick={() => setTab(MENU_ITEMS[3])}
          />
        </>
    </div>
  );
};

export default withRouter(OnboardingMenu);
