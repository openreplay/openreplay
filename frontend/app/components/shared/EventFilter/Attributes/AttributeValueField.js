import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './attributeItem.css'
import { Dropdown } from 'semantic-ui-react';
import { LinkStyledInput, CircularLoader } from 'UI';
import { KEYS } from 'Types/filter/customFilter';
import Event, { TYPES } from 'Types/filter/event';
import CustomFilter from 'Types/filter/customFilter';
import { setActiveKey, addCustomFilter, removeCustomFilter, applyFilter } from 'Duck/funnelFilters';
import DurationFilter from '../DurationFilter/DurationFilter';
import AutoComplete from '../AutoComplete';

const DEFAULT = null;

const getHeader = (type) => {
  if (type === 'LOCATION') return 'Path';

  return type;
}

@connect(null, { 
  setActiveKey,
  addCustomFilter,
  removeCustomFilter,
  applyFilter,
})
class AttributeValueField extends React.PureComponent {
  state = {
    minDuration: this.props.filter.minDuration,
    maxDuration: this.props.filter.maxDuration,
  }

  onValueChange = (e, { name: key, value }) => {
    this.props.addCustomFilter(key, value);
  };

  onDurationChange = (durationValues) => {
    this.setState(durationValues);
  }

  isAutoComplete = (type) => {
    switch (type) {
      case TYPES.METADATA:
      case TYPES.CLICK:
      case TYPES.CONSOLE:
      case TYPES.GRAPHQL:
      case TYPES.FETCH:
      case TYPES.STATEACTION:
      case TYPES.USERID:
      case TYPES.USERANONYMOUSID:
      case TYPES.REVID:
      case TYPES.GRAPHQL:
      case TYPES.CUSTOM:
      case TYPES.LOCATION:
      case TYPES.INPUT:
      case 'metadata':
        return true;
    }

    return false;
  }

  handleClose = (e) => {
    const { filter, onChange } = this.props;
    if (filter.key === KEYS.DURATION) {
      const { maxDuration, minDuration, key } = filter;
      if (maxDuration || minDuration) return;
      if (maxDuration !== this.state.maxDuration || 
          minDuration !== this.state.minDuration) {
        onChange(e, { name: 'value', value: [this.state.minDuration, this.state.maxDuration] });
      }
    }
  }

  renderField() {
    const { filter, onChange } = this.props;
    
    if (filter.key === KEYS.DURATION) {
      const { maxDuration, minDuration } = this.state;
      return (
        <DurationFilter
          onChange={ this.onDurationChange }
          onEnterPress={ this.handleClose }
          onBlur={this.handleClose}
          minDuration={ minDuration }
          maxDuration={ maxDuration }
        />
      );
    }

    const { options = [], handleSearchChange, loading } = this.props;
    return (
      <Dropdown
        className={ cn(stl.filterDropdown) }
        placeholder="Select"
        name="value"
        search
        selection
        value={ filter.value || DEFAULT }
        options={ options }
        multiple={options.length > 0 || options.size > 0}
        onChange={ onChange }
        onSearchChange={handleSearchChange}
        icon={ null }
        noResultsMessage={loading ? <div>
          <CircularLoader loading={ loading } style={ { marginRight: '8px' } } />
        </div>: 'No results found.'}
      />
    )
  }

  optionMapping = (values) => {
    const { filter } = this.props;
    if ([KEYS.USER_DEVICE, KEYS.USER_OS, KEYS.USER_BROWSER, KEYS.REFERRER].indexOf(filter.type) !== -1)
      return values.map(item => ({ type: TYPES.METADATA, value: item })).map(CustomFilter);
    else {
      return values.map(Event);
    }
  }

  getParams = filter => {
    const params = {};

    if (filter.type === TYPES.METADATA) {
      params.key = filter.key
    }

    params.type = filter.type
    if (filter.type === TYPES.ERROR && filter.source) {
      params.source = filter.source
    }
    return params;
  }

  render() {
    const { filter, onChange } = this.props;
    const _showAutoComplete = this.isAutoComplete(filter.type);
    const _params = _showAutoComplete ? this.getParams(filter) : {};    
    let _optionsEndpoint= '/events/search';
    console.log('value', filter.value)

    return (
      <React.Fragment>
        { _showAutoComplete ? 
          <AutoComplete
            name={ 'value' }
            endpoint={ _optionsEndpoint }
            value={ filter.value }
            params={ _params }          
            optionMapping={this.optionMapping}            
            onSelect={ onChange }
            headerText={ <h5 className={ stl.header }>{ getHeader(filter.type) }</h5> }
            fullWidth={ (filter.type === TYPES.CONSOLE || filter.type === TYPES.LOCATION || filter.type === TYPES.CUSTOM) && filter.value }
            // onAddOrRemove={}
          />
        : this.renderField()
        }
        { filter.type === 'INPUT' &&
          <LinkStyledInput
            displayLabel="Specify value"
            placeholder="Specify value"
            name="custom"
            onChange={ onChange }
            value={filter.custom}
          />          
        }
      </React.Fragment>
    );
  }
}

export default AttributeValueField;
