import React from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select'
import { sort } from 'Duck/sessions';
import { applyIssueFilter } from 'Duck/funnels';

const sortOptionsMap = {
  'afectedUsers-desc': 'Affected Users (High)',
  'afectedUsers-asc': 'Affected Users (Low)',
  'conversionImpact-desc': 'Conversion Impact (High)',
  'conversionImpact-asc': 'Conversion Impact (Low)',
  'lostConversions-desc': 'Lost Conversions (High)',
  'lostConversions-asc': 'Lost Conversions (Low)',
};

const sortOptions = Object.entries(sortOptionsMap)
  .map(([ value, label ]) => ({ value, label }));

@connect(state => ({
  sorts: state.getIn(['funnels', 'issueFilters', 'sort'])
}), { sort, applyIssueFilter })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = ({ value }) => {
    this.setState({ value: value })
    const [ sort, order ] = value.split('-');
    const sign = order === 'desc' ? -1 : 1;
    this.props.applyIssueFilter({ sort: { order, sort } });

    this.props.sort(sort, sign)
    setTimeout(() => this.props.sort(sort, sign), 3000); //AAA
  }

  render() {    
    const { sorts } = this.props;        

    return (
      <Select
        plain
        right
        name="sortSessions"
        defaultValue={sorts.sort + '-' + sorts.order}
        options={sortOptions}
        onChange={ this.sort }
      />
    );
  }
}
