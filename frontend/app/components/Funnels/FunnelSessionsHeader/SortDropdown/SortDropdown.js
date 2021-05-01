import { connect } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';
import { Icon } from 'UI';
import { setSessionsSort as sort } from 'Duck/funnels';
import { setSessionsSort } from 'Duck/funnels';
import stl from './sortDropdown.css';

@connect(state => ({
  sessionsSort: state.getIn(['funnels','sessionsSort'])
}), { sort, setSessionsSort })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = (e, { value }) => {
    this.setState({ value: value })
    const [ sort, order ] = value.split('-');
    const sign = order === 'desc' ? -1 : 1;    
    setTimeout(() => this.props.sort(sort, sign), 100);
  }

  render() {
    const { options, issuesSort } = this.props;    
    const { value = 'startTs-desc' } = this.state;
    return (
      <Dropdown
        name="sortSessions"
        className={ stl.dropdown }        
        direction="left"
        options={ options }
        onChange={ this.sort }
        defaultValue={ options[ 0 ].value }
        icon={null}
        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
      />
    );
  }
}
