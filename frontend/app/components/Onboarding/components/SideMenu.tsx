import { Divider, Layout, Menu } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { OB_TABS } from 'App/routes';
import { Icon } from 'UI';

import SupportModal from '../../../layout/SupportModal';
import { useStore } from '../../../mstore';
import { useTranslation } from 'react-i18next';

interface Props {
  activeTab: string;
  onClick: (tab: string) => void;
}
function SideMenu(props: Props) {
  const { t } = useTranslation();
  const [supportOpen, setSupportOpen] = React.useState(false);
  const { settingsStore } = useStore();
  const { activeTab } = props;

  const handleClick = (item: any) => {
    if (item.key === 'support') {
      return setSupportOpen(true);
    }
    props.onClick(item.key);
  };
  return (
    <Layout.Sider
      style={{
        position: 'sticky',
        top: 70, // Height of the Header
        // backgroundColor: '#f6f6f6',
        height: 'calc(100vh - 70px)', // Adjust the height to accommodate the Header
        overflow: 'auto', // Enable scrolling for the Sider content if needed
      }}
      collapsed={settingsStore.menuCollapsed}
      width={250}
    >
      <div className="w-full">
        <Menu
          mode="inline"
          onClick={handleClick}
          style={{ border: 'none' }}
          selectedKeys={activeTab ? [activeTab] : []}
        >
          <Menu.Item
            key={OB_TABS.INSTALLING}
            icon={
              <Icon
                name="tools"
                size={16}
                color={activeTab === OB_TABS.INSTALLING ? 'teal' : 'gray'}
              />
            }
            className="!rounded-lg hover-fill-teal"
          >
            {t('Setup OpenReplay')}
          </Menu.Item>
          <Menu.Item
            key={OB_TABS.IDENTIFY_USERS}
            icon={
              <Icon
                name="person-border"
                size={16}
                color={activeTab === OB_TABS.IDENTIFY_USERS ? 'teal' : 'gray'}
              />
            }
            className="!rounded-lg hover-fill-teal"
          >
            {t('Identify Users')}
          </Menu.Item>
          <Menu.Item
            key={OB_TABS.MANAGE_USERS}
            icon={
              <Icon
                name="people"
                size={16}
                color={activeTab === OB_TABS.MANAGE_USERS ? 'teal' : 'gray'}
              />
            }
            className="!rounded-lg hover-fill-teal"
          >
            {t('Invite Collaborators')}
          </Menu.Item>
          <Menu.Item
            key={OB_TABS.INTEGRATIONS}
            icon={
              <Icon
                name="plug"
                size={16}
                color={activeTab === OB_TABS.INTEGRATIONS ? 'teal' : 'gray'}
              />
            }
            className="!rounded-lg hover-fill-teal"
          >
            {t('Integrations')}
          </Menu.Item>
          <Divider style={{ margin: '6px 0' }} />
          <Menu.Item
            key="support"
            icon={
              <Icon
                name="question-circle"
                size={16}
                color={activeTab === 'support' ? 'teal' : 'gray'}
              />
            }
            className="!rounded-lg hover-fill-teal"
          >
            {t('Support')}
          </Menu.Item>
        </Menu>
      </div>
      <SupportModal
        onClose={() => {
          setSupportOpen(false);
        }}
        open={supportOpen}
      />
    </Layout.Sider>
  );
}

export default observer(SideMenu);
