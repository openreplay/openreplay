import React from 'react';
import { Segmented } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function TabSelector() {
  const { uiPlayerStore } = useStore();
  const currentValue = uiPlayerStore.dataSource;
  const options = [
    { label: 'All Tabs', value: 'all' },
    { label: 'Current Tab', value: 'current' },
  ];

  const onChange = (value: 'all' | 'current') => {
    uiPlayerStore.changeDataSource(value);
  };
  return (
    <Segmented
      options={options}
      value={currentValue}
      onChange={onChange}
      className="font-medium rounded-lg"
      size="small"
    />
  );
}

export default observer(TabSelector);
