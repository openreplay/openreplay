import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import { getRE } from 'App/utils';
import { defaultFilters } from 'Types/filter';
import { KEYS } from 'Types/filter/customFilter';
import { 
  applyFilter, setActiveKey, addEvent, 
  removeEvent, setFilterOptions, 
  addAttribute, removeAttribute
} from 'Duck/funnelFilters';
import { debounce } from 'App/utils';
import FilterItem from '../FilterItem';
import logger from 'App/logger';

import stl from './filterModal.css';

const customFilterAutoCompleteKeys = ['METADATA', KEYS.CLICK, KEYS.USER_BROWSER, KEYS.USER_OS, KEYS.USER_DEVICE, KEYS.REFERRER]

@connect(state => ({
  filter: state.getIn([ 'funnelFilters', 'appliedFilter' ]),
  customFilters: state.getIn([ 'funnelFilters', 'customFilters' ]),
  variables: state.getIn([ 'customFields', 'list' ]),
  sources: state.getIn([ 'customFields', 'sources' ]),
  funnel: state.getIn(['funnels', 'instance']),
}), {
  applyFilter,
  setActiveKey,
  addEvent,
  removeEvent,
  addAttribute,
  removeAttribute,
  setFilterOptions
})
export default class FilterModal extends React.PureComponent {
  state = { query: '' }
  applyFilter = debounce(this.props.applyFilter, 300);

  onFilterClick = (filter, apply) => {
    const { funnel } = this.props;
    const key = filter.key || filter.type;    
    this.addFilter(filter);
    if (apply || filter.hasNoValue) {       
      this.applyFilter(null, funnel.funnelId);
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
    const blocks = [];
    for (let j = 0; j < list.length; j++) {
      blocks.push(
        <div key={`${ j }-block`} className="mr-5" >
          { list[ j ] && this.renderFilterItem(type, list[ j ]) }
        </div>
      );
    }
    return blocks;
  }

  test = (value = '') => getRE(this.props.searchQuery, 'i').test(value);

  render() {
    const { 
      displayed,
      customFilters,
      filter,
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
    

    return (!displayed ? null :
      <div  className={ stl.modal }>                
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
      </div>
    );
  }
}
