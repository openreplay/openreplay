import React from 'react';
import APIClient from 'App/api_client';
import cn from 'classnames';
import { Input, Icon } from 'UI';
import { debounce } from 'App/utils';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import EventSearchInput from 'Shared/EventSearchInput';
import stl from './autoComplete.module.css';
import FilterItem from '../CustomFilters/FilterItem';

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
    const _value = value ? value.trim() : undefined;
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
      const _value = value ? value.trim() : undefined;
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
      optionMapping = defaultOptionMapping,
      valueToText = defaultValueToText,
      placeholder = 'Type to search...',
      headerText = '',
      fullWidth = false,
      onRemoveValue = () => {},
      onAddValue = () => {},
      showCloseButton = false,
    } = this.props;

    const options = optionMapping(values, valueToText)

    return (
      <OutsideClickDetectingDiv
        className={ cn("relative flex items-center", { "flex-1" : fullWidth }) }
        onClickOutside={this.onClickOutside}
      >
        {/* <EventSearchInput /> */}
        <div className={stl.inputWrapper}>
          <input
            name="query"
            // className={cn(stl.input)}
            onFocus={ () => this.setState({ddOpen: true})}
            onChange={ this.onInputChange }
            onBlur={ this.onBlur }
            value={ query }
            autoFocus={ true }
            type="text"
            placeholder={ placeholder }
            onPaste={(e) => {
              const text = e.clipboardData.getData('Text');
              this.hiddenInput.value = text;
              pasted = true; // to use only the hidden input
            } }
            autocomplete="do-not-autofill-bad-chrome"
          />
          <div className={stl.right} onClick={showCloseButton ? onRemoveValue : onAddValue}>
            { showCloseButton ? <Icon name="close" size="14" /> : <span className="px-1">or</span>}
          </div>
        </div>

        {showCloseButton && <div className='ml-2'>or</div>}
        {/* <Input
          className={ cn(stl.searchInput, { [ stl.fullWidth] : fullWidth }) }
          onChange={ this.onInputChange }
          onBlur={ this.onBlur }
          onFocus={ () => this.setState({ddOpen: true})}
          value={ query }
          // icon="search"
          label={{ basic: true, content: <div>test</div> }}
          labelPosition='right'
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
              ))
            }
          </div>
        }
      </OutsideClickDetectingDiv>
    );
  }
}

export default AutoComplete;
