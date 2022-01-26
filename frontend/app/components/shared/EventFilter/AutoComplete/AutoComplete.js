import React from 'react';
import APIClient from 'App/api_client';
import cn from 'classnames';
import { Input } from 'UI';
import { debounce } from 'App/utils';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import stl from './autoComplete.css';
import FilterItem from '../FilterItem';

const TYPE_TO_SEARCH_MSG = "Start typing to search...";
const NO_RESULTS_MSG = "No results found.";
const SOME_ERROR_MSG = "Some error occured.";
const defaultValueToText = value => value;
const defaultOptionMapping = (values, valueToText) => values.map(value => ({ text: valueToText(value), value }));

const hiddenStyle = { 
  whiteSpace: 'pre-wrap',
  opacity: 0, position: 'fixed', left: '-3000px'
};

let pasted = false;
let changed = false;

class AutoComplete extends React.PureComponent {
  static defaultProps = {
    method: 'GET',
    params: {},
  }

  state = {
    values: [],
    noResultsMessage: TYPE_TO_SEARCH_MSG,
    ddOpen: false,
    query: this.props.value,    
    loading: false,
    error: false
  }  

  componentWillReceiveProps(newProps) {
    if (this.props.value !== newProps.value) {
      this.setState({ query: newProps.value});
    }
  }

  onClickOutside = () => {
    this.setState({ ddOpen: false });
  }

  requestValues = (q) => {
    const { params, endpoint, method } = this.props;
    this.setState({ 
      loading: true, 
      error: false,
    });
    return new APIClient()[ method.toLowerCase() ](endpoint, { ...params, q })
    .then(response => response.json())
    .then(({ errors, data }) => {
      if (errors) {
        this.setError();
      } else {
        this.setState({
          ddOpen: true,
          values: data,
          loading: false,
          noResultsMessage: NO_RESULTS_MSG,
        });
      }
    })
    .catch(this.setError);
  }

  debouncedRequestValues = debounce(this.requestValues, 1000)

  setError = () => this.setState({ 
    loading: false,
    error: true,
    noResultsMessage: SOME_ERROR_MSG,
  })

  onInputChange = ({ target: { value } }) => {    
    changed = true;
    this.setState({ query: value, updated: true })
    const _value = value.trim();
    if (_value !== '' && _value !== ' ') {
      this.debouncedRequestValues(_value)
    }
  }

  onBlur = ({ target: { value } }) => {
    // to avoid sending unnecessary request on focus in/out without changing
    if (!changed && !pasted) return;

    value = pasted ? this.hiddenInput.value : value;
    const { onSelect, name } = this.props;
    if (value !== this.props.value) {
      const _value = value.trim();
      onSelect(null, {name, value: _value});
    }
    
    changed = false;
    pasted = false;
  }

  onItemClick = (e, item) => {
    e.stopPropagation();
    e.preventDefault();
    const { onSelect, name } = this.props;

    this.setState({ query: item.value, ddOpen: false})
    onSelect(e, {name, ...item.toJS()});
  }

  render() {
    const { ddOpen, query, loading, values } = this.state;
    const {
      // values = [],
      optionMapping = defaultOptionMapping,
      valueToText = defaultValueToText,
      placeholder = 'Type to search...',
      headerText = '',
      fullWidth = false,
      onAddOrRemove = () => null,
    } = this.props;

    const options = optionMapping(values, valueToText)
    
    return (
      <OutsideClickDetectingDiv 
        className={ cn("relative", { "flex-1" : fullWidth }) } 
        onClickOutside={this.onClickOutside}
      >
        {/* <Input
          className={ cn(stl.searchInput, { [ stl.fullWidth] : fullWidth }) }
          onChange={ this.onInputChange }
          onBlur={ this.onBlur }
          onFocus={ () => this.setState({ddOpen: true})}
          value={ query }
          icon="search"
          loading={ loading }
          autoFocus={ true }
          type="search"
          placeholder={ placeholder }
          onPaste={(e) => {
            const text = e.clipboardData.getData('Text');
            this.hiddenInput.value = text;
            pasted = true; // to use only the hidden input
          } }
        /> */}
        <div className={stl.inputWrapper}>
          <input
            name="query"
            // className={cn(stl.input)}
            onFocus={ () => this.setState({ddOpen: true})}
            onChange={ this.onInputChange }
            onBlur={ this.onBlur }
            onFocus={ () => this.setState({ddOpen: true})}
            value={ query }
            autoFocus={ true }
            type="text"
            placeholder={ placeholder }
            onPaste={(e) => {
              const text = e.clipboardData.getData('Text');
              this.hiddenInput.value = text;
              pasted = true; // to use only the hidden input
            } }
          />
          <div className={cn(stl.right, 'cursor-pointer')} onLick={onAddOrRemove}>
            {/* <Icon name="close" size="18" /> */}
            <span className="px-1">or</span>
          </div>
        </div>
        <textarea style={hiddenStyle} ref={(ref) => this.hiddenInput = ref }></textarea>
        { ddOpen && options.length > 0 &&
          <div className={ stl.menu }>
            { headerText && headerText }
            {
              options.map(item => (
                <FilterItem 
                  label={ item.value }
                  icon={ item.icon }
                  onClick={ (e) => this.onItemClick(e, item) } 
                />
                // <DropdownItem key={ item.value } value={ item.value } onSelect={ (e) => this.onItemClick(e, item) } />
              ))
            }
          </div>
        }
      </OutsideClickDetectingDiv>
    );
  }
}

export default AutoComplete;
