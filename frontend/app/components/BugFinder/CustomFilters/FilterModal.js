import React from 'react';
import cn from 'classnames';
import { List } from 'immutable';
import { connect } from 'react-redux';
import { getRE } from 'App/utils';
import { defaultFilters, preloadedFilters } from 'Types/filter';
import { TYPES } from 'Types/filter/event';
import CustomFilter, { KEYS } from 'Types/filter/customFilter';
import { applyFilter, setActiveKey, addEvent, removeEvent, setFilterOption, changeEvent, addAttribute, removeAttribute } from 'Duck/filters';
import { NoContent, CircularLoader } from 'UI';
import { debounce } from 'App/utils';
import FilterItem from './FilterItem';
import logger from 'App/logger';

import stl from './filterModal.css';

const customFilterAutoCompleteKeys = ['METADATA', KEYS.CLICK, KEYS.USER_BROWSER, KEYS.USER_OS, KEYS.USER_DEVICE, KEYS.REFERRER]

@connect(state => ({
  filter: state.getIn([ 'filters', 'appliedFilter' ]),
  customFilters: state.getIn([ 'filters', 'customFilters' ]),
  variables: state.getIn([ 'customFields', 'list' ]),
  sources: state.getIn([ 'customFields', 'sources' ]),
  activeTab: state.getIn([ 'sessions', 'activeTab', 'type' ]),
}), {
  applyFilter,
  setActiveKey,
  addEvent,
  removeEvent,
  addAttribute,
  removeAttribute,
  setFilterOption
})
export default class FilterModal extends React.PureComponent {
  state = { query: '' }
  applyFilter = debounce(this.props.applyFilter, 300);

  onFilterClick = (filter, apply) => {
    const key = filter.key || filter.type;
    if (customFilterAutoCompleteKeys.includes(key)) {      
      this.props.setFilterOption(key, filter.value ? [{value: filter.value[0], type: key}] : [])      
    }
    this.addFilter(filter);
    if (apply || filter.hasNoValue) {
      this.applyFilter();
    }
  }

  renderFilterItem(type, filter) {
    return (
      <FilterItem
        className="capitalize" 
        label={ filter.label || filter.key }
        icon={ filter.icon }
        onClick={ () => this.onFilterClick(filter) } 
      />
    );
  }

  addFilter = (filter) => {
    const { index, filterType, filter: { filters } } = this.props;
    this.props.close();

    if (filter.isFilter || filter.type === 'METADATA') {
      logger.log('Adding Filter', filter)
      const _index = filterType === 'filter' ? index : undefined; // should add new one if coming from events      
      const _in = filters.findIndex(e => e.type === 'USERID');      
      this.props.addAttribute(filter, _in >= 0 ? _in : _index);
    } else {
      logger.log('Adding Event', filter)
      const _index = filterType === 'event' ? index : undefined; // should add new one if coming from filters
      this.props.addEvent(filter, false, _index);
    }

    if (filterType === 'event' && filter.isFilter) { // selected a filter from events
      this.props.removeEvent(index);
    }

    if (filterType === 'filter' && !filter.isFilter) { // selected an event from filters
      this.props.removeAttribute(index);
    }
  };

  renderList(type, list) {
    const { activeTab } = this.props;
    const blocks = [];
    for (let j = 0; j < list.length; j++) {
      blocks.push(
        <div key={`${ j }-block`} className={cn("mr-5", { [stl.disabled]: activeTab === 'live' && list[j].key !== 'USERID' })} >
          { list[ j ] && this.renderFilterItem(type, list[ j ]) }
        </div>
      );
    }
    return blocks;
  }

  test = (value = '') => getRE(this.props.searchQuery, 'i').test(value);

  renderEventDropdownItem = filter => (
    <FilterItem
      key={ filter.actualValue || filter.value }
      label={ filter.actualValue || filter.value }
      icon={ filter.icon }
      onClick={ () => this.onFilterClick(filter, true) } 
    />
  )

  renderEventDropdownPartFromList = (list, headerText) => (list.size > 0 &&
    <div className={ cn(stl.filterGroupApi, 'mb-2') }>
      <h5 className={ stl.header }>{ headerText }</h5>
      { list.map(this.renderEventDropdownItem) }
    </div>
  )

  renderEventDropdownPart = (type, headerText) => {
    const searched = this.props.searchedEvents
    .filter(e => e.type === type)
    .filter(({ value, target }) => !this.props.loading || this.test(value) || this.test(target && target.label));
    
    return this.renderEventDropdownPartFromList(searched, headerText)
  };

  renderStaticFiltersDropdownPart = (type, headerText, appliedFilterKeys) => {
    if (appliedFilterKeys && appliedFilterKeys.includes(type)) return;
    const staticFilters = List(preloadedFilters)
      .filter(e => e.type === type)
      .filter(({ value, actualValue }) => this.test(actualValue || value))
      .map(CustomFilter);
    
    return this.renderEventDropdownPartFromList(staticFilters, headerText)
  };

  render() {
    const { 
      displayed,
      customFilters,
      filter,
      loading = false,
      searchedEvents,
      searchQuery = '',
      activeTab,
    } = this.props;
    const { query } = this.state;
    const reg = getRE(query, 'i');
    
    const _appliedFilterKeys = filter.filters.map(({type}) => type).toJS();
    const filteredList = defaultFilters.map(cat => {
      let _keys = [];
      if (query.length === 0 && cat.type === 'custom') { // default show limited custom fields
        _keys = cat.keys.slice(0, 9).filter(({key}) => reg.test(key))
      } else {
        _keys = cat.keys.filter(({key}) => reg.test(key));
      }
      return {
        ...cat,        
        keys: _keys
          .filter(({key, filterKey}) => !_appliedFilterKeys.includes(filterKey) && !customFilters.has(filterKey || key) && !filter.get(filterKey || key))          
      }
    }).filter(cat => cat.keys.length > 0);
    
    const staticFilters = preloadedFilters
      .filter(({ value, actualValue }) => !this.props.loading && this.test(actualValue || value))

    // console.log('filteredList', filteredList);

    return (!displayed ? null :
      <div  className={ stl.modal }>
        { loading && 
          <div style={ {marginBottom: '20px'}}><CircularLoader loading={ loading } /></div>
        }
        
        <NoContent
          title="No results found."
          size="small"
          show={ searchQuery !== '' && !loading && staticFilters.length === 0 && searchedEvents.size === 0 }
        >
          <div className={ stl.filterListDynamic }>
            { searchQuery &&
              <React.Fragment>
                {this.renderEventDropdownPart(TYPES.USERID, 'User Id')}
                {activeTab !== 'live' && (
                  <>  
                    {this.renderEventDropdownPart(TYPES.METADATA, 'Metadata')}
                    {this.renderEventDropdownPart(TYPES.CONSOLE, 'Errors')}
                    {this.renderEventDropdownPart(TYPES.CUSTOM, 'Custom Events')}
                    {this.renderEventDropdownPart(KEYS.USER_COUNTRY, 'Country', _appliedFilterKeys)}
                    {this.renderEventDropdownPart(KEYS.USER_BROWSER, 'Browser', _appliedFilterKeys)}
                    {this.renderEventDropdownPart(KEYS.USER_DEVICE, 'Device', _appliedFilterKeys)}
                    {this.renderEventDropdownPart(TYPES.LOCATION, 'Page')}
                    {this.renderEventDropdownPart(TYPES.CLICK, 'Click')}
                    {this.renderEventDropdownPart(TYPES.FETCH, 'Fetch')}
                    {this.renderEventDropdownPart(TYPES.INPUT, 'Input')}
    
                    {this.renderEventDropdownPart(KEYS.USER_OS, 'Operating System', _appliedFilterKeys)}
                    {this.renderEventDropdownPart(KEYS.REFERRER, 'Referrer', _appliedFilterKeys)}
                    {this.renderEventDropdownPart(TYPES.GRAPHQL, 'GraphQL')}
                    {this.renderEventDropdownPart(TYPES.STATEACTION, 'Store Action')}
                    {this.renderEventDropdownPart(TYPES.REVID, 'Rev ID')}
                  </>
                )}
              </React.Fragment>
            }
          </div>
          { searchQuery === '' &&
            <div className={ stl.filterListStatic }>
              {
                filteredList.map(category => (
                  <div className={ cn(stl.filterGroup, 'mr-6 mb-6') } key={category.category}>
                    <h5 className={ stl.header }>{ category.category }</h5>
                    <div className={ stl.list }>
                      { this.renderList(category.type, category.keys) }
                    </div>
                  </div>
                ))   
              }
            </div>
          }
        </NoContent>
      </div>
    );
  }
}
