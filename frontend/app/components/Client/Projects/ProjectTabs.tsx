import React from 'react';
import { Tabs, TabsProps } from 'antd';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const customTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
  <DefaultTabBar {...props} className="!mb-0" />
);

function ProjectTabs() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const activeTab = projectsStore.config.tab;

  const tabItems = [
    {
      key: 'installation',
      label: t('Installation'),
      content: <div>{t('Installation Content')}</div>,
    },
    {
      key: 'captureRate',
      label: t('Capture Rate'),
      content: <div>{t('Capture Rate Content')}</div>,
    },
    {
      key: 'metadata',
      label: t('Metadata'),
      content: <div>{t('Metadata Content')}</div>,
    },
    { key: 'tags', label: t('Tags'), content: <div>{t('Tags Content')}</div> },
    // { key: 'groupKeys', label: 'Group Keys', content: <div>Group Keys Content</div> }
  ];

  const onTabChange = (key: string) => {
    projectsStore.setConfigTab(key);
  };

  return (
    <Tabs
      type="line"
      defaultActiveKey={tabItems[0].key}
      activeKey={activeTab}
      style={{ borderBottom: 'none' }}
      onChange={onTabChange}
      renderTabBar={customTabBar}
      items={tabItems.map((tab) => ({
        key: tab.key,
        label: tab.label,
      }))}
    />
  );
}

export default observer(ProjectTabs);
