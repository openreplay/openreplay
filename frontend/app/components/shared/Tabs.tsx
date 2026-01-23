import React from 'react';
import { Tabs, TabsProps } from 'antd';

const customTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
  <DefaultTabBar {...props} className="mb-0!" />
);

function CustomizedTabs({
  items,
  onChange,
  activeKey,
}: {
  items: { key: string; label: React.ReactNode }[];
  onChange: (key: string) => void;
  activeKey: string;
}) {
  const customItems = items.map((i) => ({
    ...i,
    content: <div>placeholder</div>,
  }));

  return (
    <Tabs
      type={'line'}
      defaultActiveKey={items[0].key}
      activeKey={activeKey}
      style={{ borderBottom: 'none' }}
      onChange={onChange}
      items={customItems}
      renderTabBar={customTabBar}
    />
  );
}

export default CustomizedTabs;
