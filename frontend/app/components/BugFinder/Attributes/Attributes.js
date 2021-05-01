import React from 'react';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import { KEYS } from 'Types/filter/customFilter';
import { addAttribute } from 'Duck/filters';
import AttributeItem from './AttributeItem';
import ListHeader from '../ListHeader';
import logger from 'App/logger';

const DEFAULT = null;
const DEFAULT_OPTION = { text: 'Any', value: DEFAULT };
const toOptions = (values, mapper) => (values ? values
  .map(({value}) => ({
    text: mapper ? mapper[ value ] : value,
    value,
  }))  
  .toJS() : [ DEFAULT_OPTION ]);

const countryOptions = Object.keys(countries).map(i => ({ text: countries[i], value: i }));
  
@connect(state => ({
  filters: state.getIn([ 'filters', 'appliedFilter', 'filters' ]),
  filterValues: state.get('filterValues'),
  filterOptions: state.getIn([ 'filters', 'filterOptions' ]),
}), {
  addAttribute,
})
class Attributes extends React.PureComponent {
  getOptions = filter => {
    const { filterValues, filterOptions } = this.props;
    
    if (filter.key === KEYS.USER_COUNTRY) {
      logger.log('Filters: country')
      return countryOptions;
    }

    if (filter.key === KEYS.METADATA) {
      logger.log('Filters: metadata ' + filter.key)
      const options = filterValues.get(filter.key);
      return options && options.size ? toOptions(options) : [];
    }

    logger.log('Filters: general filters ' + filter.key)
    const options = filterOptions.get(filter.key)    
    return options && options.size ? toOptions(options.filter(i => !!i)) : []
  }
  render() {
    const { filters } = this.props;
    return (
      <>
        { filters.size > 0 &&
          <div>
            <div className="py-1"><ListHeader title="Filters" /></div>
            {
              filters.map((filter, index) => (
                <AttributeItem
                  key={index}
                  index={ index }
                  filter={ filter }
                  options={ this.getOptions(filter) }
                />
              ))
            }
          </div>
        }
      </>
    );
  }
}

export default Attributes;
