import { connect } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';
import { Icon } from 'UI';
import { sort } from 'Duck/sessions';
import { applyIssueFilter } from 'Duck/funnels';
import stl from './sortDropdown.css';

const sortOptionsMap = {
  'afectedUsers-desc': 'Affected Users (High)',
  'afectedUsers-asc': 'Affected Users (Low)',
  'conversionImpact-desc': 'Conversion Impact (High)',
  'conversionImpact-asc': 'Conversion Impact (Low)',
  'lostConversions-desc': 'Lost Conversions (High)',
  'lostConversions-asc': 'Lost Conversions (Low)',
};

const sortOptions = Object.entries(sortOptionsMap)
  .map(([ value, text ]) => ({ value, text }));

@connect(state => ({
  sorts: state.getIn(['funnels', 'issueFilters', 'sort'])
}), { sort, applyIssueFilter })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = (e, { value }) => {
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
      <Dropdown
        name="sortSessions"
        className={ stl.dropdown }        
        direction="left"
        options={ sortOptions }
        onChange={ this.sort }
        defaultValue={sorts.sort + '-' + sorts.order}
        icon={null}
        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
      />
    );
  }
}
