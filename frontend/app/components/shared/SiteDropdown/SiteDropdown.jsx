import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

import Select from 'Shared/Select';

function SiteDropdown({ contextName = '', onChange, value, size }) {
  const { projectsStore } = useStore();
  const sites = projectsStore.list;
  const options = sites.map((site) => ({ value: site.id, label: site.host }));
  return (
    <Select
      name={`${contextName}_site`}
      placeholder="Select Site"
      options={options}
      value={options.find((option) => option.value === String(value))}
      onChange={onChange}
      size={size}
      className={'max-w-[220px]'}
    />
  );
}

SiteDropdown.displayName = 'SiteDropdown';

export default observer(SiteDropdown);
