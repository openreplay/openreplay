import React from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select';
import { setSessionsSort as sort } from 'Duck/funnels';
import { setSessionsSort } from 'Duck/funnels';

@connect(state => ({
  sessionsSort: state.getIn(['funnels','sessionsSort'])
}), { sort, setSessionsSort })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = ({ value }) => {
    this.setState({ value: value })
    const [ sort, order ] = value.split('-');
    const sign = order === 'desc' ? -1 : 1;    
    setTimeout(() => this.props.sort(sort, sign), 100);
  }

  render() {
    const { options, issuesSort } = this.props;    
    return (
      <Select
        right
        plain
        name="sortSessions"
        options={options}
        defaultValue={ options[ 0 ].value }
        onChange={ this.sort }
      />
    );
  }
}
