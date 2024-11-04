import React from 'react'
import { connect } from 'react-redux';
import { Icon, Dropdown, TagBadge } from 'UI'
import { applyIssueFilter, removeIssueFilter } from 'Duck/funnels';
import cn from 'classnames';
import stl from './issueFilter.module.css';
import { List } from 'immutable';

function IssueFilter(props) {
  const { filters, issueTypes, issueTypesMap } = props;  

  const onChangeFilter = (e, { name, value }) => {
    const errors = filters.toJS();
    errors.push(value);    
    props.applyIssueFilter({ filters: List(errors) });
  }

  return (
    <div className="flex items-start">
      <Dropdown
        trigger={
          <div className={cn("py-2 px-3 bg-white rounded-full flex items-center text-sm mb-2", stl.filterBtn)}> 
            <Icon name="filter" size="12" color="teal" />
            <span className="ml-2 font-medium leading-none">Filter</span>
          </div>
        }          
        options={ issueTypes.filter(i => !filters.includes(i.value)) }
        name="change"
        icon={null}
        onChange={onChangeFilter}
        basic
        scrolling        
        selectOnBlur={false}        
      />
      <div className="flex items-center ml-3 flex-wrap">
        {filters.map(err => (
          <TagBadge
            className="mb-2"
            key={ err }
            hashed={false}
            text={ issueTypesMap[err] }
            onRemove={ () => props.removeIssueFilter(err) }            
            outline
          />          
        ))}
      </div>
    </div>
  )
}

export default connect(state => ({
  filters: state.getIn(['funnels', 'issueFilters', 'filters']),
  issueTypes: state.getIn(['funnels', 'issueTypes']).toJS(),
  issueTypesMap: state.getIn(['funnels', 'issueTypesMap']),
}), { applyIssueFilter, removeIssueFilter })(IssueFilter)
