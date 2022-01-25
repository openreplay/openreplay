import { connect } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';
import { Icon } from 'UI';
import { sort } from 'Duck/sessions';
import { applyFilter } from 'Duck/search';
import stl from './sortDropdown.css';

@connect(null, { sort, applyFilter })
export default class SortDropdown extends React.PureComponent {
  state = { value: null }
  sort = (e, { value }) => {
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
