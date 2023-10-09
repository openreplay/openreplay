import React, { useState } from 'react';
import { AutoComplete, Input } from 'antd';
import type { SelectProps } from 'antd/es/select';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

const UserSearch = ({ onUserSelect }: { onUserSelect: (id: any) => void }) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const { userStore } = useStore();
  const allUsers = userStore.list.map((user) => ({
    value: user.userId,
    label: user.name,
  }));
  const [options, setOptions] = useState<SelectProps<object>['options']>([]);

  React.useEffect(() => {
    if (userStore.list.length === 0) {
      userStore.fetchUsers().then((r) => {
        setOptions(
          r.map((user: any) => ({
            value: user.userId,
            label: user.name,
          }))
        );
      });
    }
  }, []);

  const handleSearch = (value: string) => {
    setOptions(
      value ? allUsers.filter((u) => u.label.toLowerCase().includes(value.toLocaleLowerCase())) : []
    );
  };

  const onSelect = (value?: string) => {
    onUserSelect(value)
    setSelectedValue(allUsers.find((u) => u.value === value)?.label || '');
  };

  return (
    <AutoComplete
      popupMatchSelectWidth={200}
      style={{ width: 200 }}
      options={options}
      onSelect={onSelect}
      onSearch={handleSearch}
      value={selectedValue}
      onChange={(e) => {
        setSelectedValue(e)
        if (!e) onUserSelect(undefined)
      }}
      onClear={() => onSelect(undefined)}
      onDeselect={() => onSelect(undefined)}
      size="small"
    >
      <Input.Search
        allowClear
        placeholder="Filter by team member name"
        size={'small'}
        classNames={{ input: '!border-0 focus:!border-0' }}
        style={{ width: 200 }}
      />
    </AutoComplete>
  );
};

export default observer(UserSearch);
