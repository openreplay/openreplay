import React from 'react';
import { Tabs, TabsProps } from 'antd';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';

const customTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
  <DefaultTabBar {...props} className="!mb-0" />
);

function ProjectTabs() {
  const { projectsStore } = useStore();
  const activeTab = projectsStore.config.tab;

  const tabItems = [
    { key: 'installation', label: 'Installation', content: <div>Installation Content</div> },
    { key: 'captureRate', label: 'Capture Rate', content: <div>Capture Rate Content</div> },
    { key: 'metadata', label: 'Metadata', content: <div>Metadata Content</div> },
    { key: 'tags', label: 'Tags', content: <div>Tags Content</div> },
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
