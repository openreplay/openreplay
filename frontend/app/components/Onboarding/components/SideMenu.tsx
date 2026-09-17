import { Menu, MenuProps } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  OB_DEFAULT_TAB,
  OB_TABS,
  onboarding as onboardingRoute,
  withSiteId,
} from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';
import { Icon } from 'UI';

import SupportModal from '../../../layout/SupportModal';
import { useStore } from '../../../mstore';

/**
 * Menu body only — the app shell's Sider wraps it and supplies the logo/collapse
 * row, so onboarding gets the same chrome as every other page.
 */
function SideMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [supportOpen, setSupportOpen] = React.useState(false);
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  // the shell renders this outside <Routes>, so there is no route match to read
  // params from — the active tab comes off the path instead
  const resolvedTab =
    location.pathname.split('/onboarding/')[1]?.split('/')[0] || OB_DEFAULT_TAB;

  const handleClick: MenuProps['onClick'] = (item) => {
    if (item.key === 'support') {
      return setSupportOpen(true);
    }
    navigate(withSiteId(onboardingRoute(item.key), siteId));
  };

  const items: MenuProps['items'] = [
    {
      key: OB_TABS.INSTALLING,
      label: t('Setup OpenReplay'),
      icon: (
        <Icon
          name="tools"
          size={16}
          color={resolvedTab === OB_TABS.INSTALLING ? 'teal' : 'gray-medium'}
        />
      ),
      className: 'rounded-lg! hover-fill-teal',
    },
    {
      key: OB_TABS.IDENTIFY_USERS,
      label: t('Identify Users'),
      icon: (
        <Icon
          name="person-border"
          size={16}
          color={resolvedTab === OB_TABS.IDENTIFY_USERS ? 'teal' : 'gray-medium'}
        />
      ),
      className: 'rounded-lg! hover-fill-teal',
    },
    {
      key: OB_TABS.MANAGE_USERS,
      label: t('Invite Collaborators'),
      icon: (
        <Icon
          name="people"
          size={16}
          color={resolvedTab === OB_TABS.MANAGE_USERS ? 'teal' : 'gray-medium'}
        />
      ),
      className: 'rounded-lg! hover-fill-teal',
    },
    {
      key: OB_TABS.INTEGRATIONS,
      label: t('Integrations'),
      icon: (
        <Icon
          name="plug"
          size={16}
          color={resolvedTab === OB_TABS.INTEGRATIONS ? 'teal' : 'gray-medium'}
        />
      ),
      className: 'rounded-lg! hover-fill-teal',
    },
    { type: 'divider' },
    {
      key: 'support',
      label: t('Support'),
      icon: (
        <Icon
          name="question-circle"
          size={16}
          color={supportOpen ? 'teal' : 'gray-medium'}
        />
      ),
      className: 'rounded-lg! hover-fill-teal',
    },
  ];

  return (
    <>
      <div className="w-full">
        <Menu
          mode="inline"
          onClick={handleClick}
          style={{ border: 'none' }}
          selectedKeys={[resolvedTab]}
          items={items}
        />
      </div>
      <SupportModal
        onClose={() => {
          setSupportOpen(false);
        }}
        open={supportOpen}
      />
    </>
  );
}

export default observer(SideMenu);
