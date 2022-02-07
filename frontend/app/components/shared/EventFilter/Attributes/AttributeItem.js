import React from 'react';
import { connect } from 'react-redux';
import { operatorOptions } from 'Types/filter';
import { Icon } from 'UI';
import { editAttribute, removeAttribute, applyFilter, fetchFilterOptions } from 'Duck/funnelFilters';
import { debounce } from 'App/utils';
import { KEYS } from 'Types/filter/customFilter';
import stl from './attributeItem.css'
import AttributeValueField from './AttributeValueField';
import OperatorDropdown from './OperatorDropdown';
import CustomFilters from '../CustomFilters';
import FilterSelectionButton from '../FilterSelectionButton';

const DEFAULT = null;

@connect(state => ({  
  loadingFilterOptions: state.getIn([ 'filters', 'fetchFilterOptions', 'loading' ]),
  filterOptions: state.getIn([ 'filters', 'filterOptions' ]),  
}), {
  editAttribute,
  removeAttribute,
  applyFilter,
  fetchFilterOptions
})

class AttributeItem extends React.PureComponent {
  applyFilter = debounce(this.props.applyFilter, 1000)
  fetchFilterOptionsDebounce = debounce(this.props.fetchFilterOptions, 500)

  onFilterChange = (e, { name, value }) => {
    const { index } = this.props;
    this.props.editAttribute(index, name, value);
    this.applyFilter();
  }

  removeFilter = () => {
    const { index } = this.props;
    this.props.removeAttribute(index)
    this.applyFilter();
  }

  handleSearchChange = (e, { searchQuery }) => {
    const { filter } = this.props;
    this.fetchFilterOptionsDebounce(filter, searchQuery);
  }

  render() {
    const { filter, options, index, loadingFilterOptions, filterOptions } = this.props;
    const _operatorOptions = operatorOptions(filter);

    let filterLabel = filter.label;
    if (filter.type === KEYS.METADATA)
      filterLabel = filter.key;

    return (
      <div className={ stl.wrapper }>
        <CustomFilters
          index={ index }
          filter={ filter }
          buttonComponent={ <FilterSelectionButton label={ filterLabel } />}
          showFilters={ true }
          filterType="filter"
        />
        { filter.type !== KEYS.DURATION &&
          <OperatorDropdown
            options={ _operatorOptions }
            onChange={ this.onFilterChange }
            value={ filter.operator || DEFAULT }
          />
        }
        {
          !filter.hasNoValue &&
          <AttributeValueField
            filter={ filter }
            options={ options }            
            onChange={ this.onFilterChange }
            handleSearchChange={this.handleSearchChange}
            loading={loadingFilterOptions}
          />
        }
        
        <div className={ stl.actions }>
          <button className={ stl.button } onClick={ this.removeFilter }>
            <Icon name="close" size="14" />
          </button>
        </div>
      </div>
    );
  }
}

export default AttributeItem;
