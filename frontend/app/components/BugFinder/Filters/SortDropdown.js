import React from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select';
import { Icon } from 'UI';
import { sort } from 'Duck/sessions';
import { applyFilter } from 'Duck/search';
import stl from './sortDropdown.module.css';

@connect(null, { sort, applyFilter })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = ({ value }) => {
    value = value.value
    this.setState({ value: value })
    const [ sort, order ] = value.split('-');
    const sign = order === 'desc' ? -1 : 1;
    this.props.applyFilter({ order, sort });

    this.props.sort(sort, sign)
    setTimeout(() => this.props.sort(sort, sign), 3000); //AAA
  }

  render() {
    const { options } = this.props;    
    return (
      <Select
        name="sortSessions"
        plain
        right
        options={ options }
        onChange={ this.sort }
        defaultValue={ options[ 0 ].value }
        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
      />
    );
  }
}
