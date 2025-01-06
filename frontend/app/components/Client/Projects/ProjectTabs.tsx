import React from 'react';
import { Tabs } from 'antd';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';

function ProjectTabs() {
  const { projectsStore } = useStore();
  const activeTab = projectsStore.config.tab;

  const tabItems = [
    { key: 'installation', label: 'Installation', content: <div>Installation Content</div> },
    { key: 'captureRate', label: 'Capture Rate', content: <div>Capture Rate Content</div> },
    { key: 'metadata', label: 'Metadata', content: <div>Metadata Content</div> },
    { key: 'tags', label: 'Tags', content: <div>Tags Content</div> },
    { key: 'groupKeys', label: 'Group Keys', content: <div>Group Keys Content</div> }
  ];

  const onTabChange = (key: string) => {
    projectsStore.setConfigTab(key);
  };

  return (
    <Tabs
      type="line"
      defaultActiveKey="installation"
      activeKey={activeTab}
      style={{ borderBottom: 'none' }}
      onChange={onTabChange}
      items={tabItems.map((tab) => ({
        key: tab.key,
        label: tab.label
        // children: tab.content,
      }))}
    />
  );
}

export default observer(ProjectTabs);
