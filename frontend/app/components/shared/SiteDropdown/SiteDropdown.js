import React from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select';

const SiteDropdown = ({ contextName = '', sites, onChange, value }) => {
  const options = sites.map(site => ({ value: site.id, label: site.host })).toJS();
  return (
    <Select
      name={`${contextName}_site`}
      placeholder='Select Site'
      options={options}
      value={options.find(option => option.value === value)}
      onChange={onChange}
    />
  );
};

SiteDropdown.displayName = 'SiteDropdown';

export default connect(state => ({
  sites: state.getIn(['site', 'list'])
}))(SiteDropdown);