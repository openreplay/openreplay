import React, { useState } from 'react'
import { Icon } from 'UI'
import { withRequest } from 'HOCs';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import WidgetAutoComplete from 'Shared/WidgetAutoComplete';
import { getRE } from 'App/utils';
import cn from 'classnames';
import stl from './filterDropdown.module.css';
import { countries } from 'App/constants';
import { regionLabels } from 'Types/integrations/cloudwatchConfig';

const PLATFORM = 'platform';
const COUNTRY = 'country';
const LOCATION = 'location';

const platformOptions = [
  { 'key': PLATFORM, label: 'Desktop', value: 1},
  { 'key': PLATFORM, label: 'Tablet', value: 2 },
  { 'key': PLATFORM, label: 'Tablet Landscape', value: 3 },
  { 'key': PLATFORM, label: 'Mobile', value: 4 },
  { 'key': PLATFORM, label: 'Mobile Landscape', value: 5 }
];

const countryOptions = Object.keys(countries).map(c => ({key: COUNTRY, label: countries[c], value: c}));
const locationOptions = Object.keys(regionLabels).map(k => ({ key: LOCATION, label: regionLabels[k], value: k}));

const _filterKeys = [
  { key: 'userId', name: 'User ID', icon: 'user-alt', placeholder: 'Search for User ID' },
  { key: 'userAnonymousId', name: 'User Anonymous ID', icon: 'filters/userid', placeholder: 'Search for User Anonymous ID' },
  { key: 'revId', name: 'Rev ID', icon: 'filters/rev-id', placeholder: 'Search for Rev ID' },
  { key: COUNTRY, name: 'Country', icon: 'map-marker-alt', placeholder: 'Search for Country' },
  { key: 'device', name: 'Device', icon: 'device', placeholder: 'Search for Device' },
  { key: 'os', name: 'OS', icon: 'os', placeholder: 'Search for OS' },
  { key: 'browser', name: 'Browser', icon: 'window', placeholder: 'Search for Browser' },
  { key: 'location', name: 'Location', icon: 'window', placeholder: 'Search for Location' },
  { key: PLATFORM, name: 'Platform', icon: 'desktop', placeholder: 'Search for Platform' },
]

const FilterDropdown = props => {
  const { filterKeyMaps = [], metaOptions, allowedFilters } = props;
  let filterKeys = metaOptions.concat(_filterKeys)  
  if (allowedFilters && allowedFilters.length > 0) {
    filterKeys = filterKeys.filter(f => allowedFilters.includes(f.key))
  }
  const [showDropdown, setShowDropdown] = useState(false)
  const [filterKey, setFilterKey] = useState(false)
  const [localOptions, setLocalOptions] = useState([]);
  const activeFilter = filterKeys.find(f => f.key === filterKey);
  const shouldFetchOptions = filterKey && filterKey !== PLATFORM && filterKey !== COUNTRY && filterKey !== LOCATION;

  const onSelect = (params) => {
    props.onSelect(params)
    setFilterKey(undefined);
    setShowDropdown(false);
  }

  const onFilterKeySelect = key => {
    setFilterKey(key);
    setShowDropdown(false);
    if (!shouldFetchOptions) {
      setLocalOptions(getLocalOptions(key))
    }
  }

  const onClickOutside = () => {
    setShowDropdown(false);
    setFilterKey(undefined);
  }

  const getLocalOptions = filterKey => {
    if (filterKey === PLATFORM) { return platformOptions }
    if (filterKey === COUNTRY) { return countryOptions }
    if (filterKey === LOCATION) { return locationOptions }
    return [];
  }

  const fetchOptions = options => {
    if (!shouldFetchOptions) { 
      const re = getRE(options.q, 'i')
      const opts = getLocalOptions(options.key).filter(f => re.test(f.text));
      return setLocalOptions(opts);
    }

    props.fetchOptions(options);
  }

  return (
    <OutsideClickDetectingDiv
      onClickOutside={onClickOutside}
    >
      <div className="relative">
        {!filterKey && (
          <div
            className={cn(stl.btn,  'rounded flex items-center p-2 color-teal cursor-pointer hover:bg-teal')}
            onClick={() => setShowDropdown(true)}
            id="filter-options"
          >
            <Icon name="plus" size={10} color="teal" />
            <span className="ml-1 text-sm tracking-wider font-medium">FILTER</span>
          </div>
        )}
        {showDropdown && (
          <div className="absolute mt-2 bg-white rounded border z-20" id="filter-dropdown" style={{ width: '200px'}}>
            <div className="font-medium mb-2 tracking-widest color-gray-dark p-3">SELECT FILTER</div>
            <div className="px-3" style={{ maxHeight: '200px', overflowY: 'auto'}} >
              {filterKeys.filter(f => !filterKeyMaps.includes(f.key)).map(f => (
                <div
                  key={f.key}
                  onClick={() => onFilterKeySelect(f.key)}
                  className={cn(stl.filterItem, 'py-3 -mx-3 px-3 flex items-center cursor-pointer')}
                >
                  <Icon name={f.icon} size="16" />
                  <span className="ml-3 capitalize">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {filterKey && (
          <WidgetAutoComplete
            className="ml-2"
            autoFocus={true}
            loading={props.optionsLoading}
            fetchOptions={options => fetchOptions({...options, key: filterKey })}
            options={shouldFetchOptions ? props.options.filter(f => f.key === filterKey) : localOptions}
            onSelect={onSelect}
            placeholder={activeFilter && activeFilter.placeholder}
            itemStyle={{ minWidth: '200px'}}
          />
        )}
      </div>
    </OutsideClickDetectingDiv>
  )
}

export default withRequest({
	dataName: "options",
  initialData: [],
  dataWrapper: data => data,
  resetBeforeRequest: true,
  loadingName: 'optionsLoading',
	requestName: "fetchOptions",
	endpoint: '/dashboard/metadata/search',
	method: 'GET'
})(FilterDropdown)
