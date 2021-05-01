import { Dropdown } from 'semantic-ui-react';

const defaultValueToText = value => value;
const defaultOptionMapping = (values, valueToText) => values.map(value => ({ text: valueToText(value), value }));

// TODO: get rid of semantic
export default class InputAutocomplete extends React.PureComponent {
  state = { ddOpen: false }

  onSearchChange = (e, { searchQuery }) => {
    const { onChange } = this.props;
    if (typeof onChange === 'function') {
      onChange(e, { value: searchQuery, name: this.props.name });
    }
  }

  onSelect = (e, t) => {
    const { onChange, onSelect } = this.props;
    if (typeof onChange === 'function') {
      onChange(e, t);
    }
    if (typeof onSelect === 'function') {
      onSelect(e, t);
    }
  }

  render() {
    const { 
      values = [],
      valueToText = defaultValueToText,
      optionMapping = defaultOptionMapping,
      ...otherProps 
    } = this.props;

    const { ddOpen } = this.state;

    const options = optionMapping(values, valueToText)
    return (
      <Dropdown
        { ...otherProps }
        selection
        options={ options }
        onChange={ this.onSelect }
        onSelect={ null }
        searchQuery={ this.props.value }
        onSearchChange={ this.onSearchChange } 
        selectOnBlur={ false }
        selectOnNavigation={ false }
        search
        deburr
        searchInput={{ autoFocus: true }}
        value={ null }
      />
    );
  }
}
