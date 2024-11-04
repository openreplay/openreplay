import React from 'react';
import cn from 'classnames';
import styles from './linkStyledInput.module.css';

export default class LinkStyledInput extends React.PureComponent {
  state = {
    value: this.props.value || '',
    changing: false,
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.value !== this.props.value) {
      this.setState({ value: this.props.value });
    }

    if (!prevState.changing && this.state.changing) {
      this.inputRef.focus();
      document.addEventListener('click', this.onEndChange, false);
      this.inputRef.addEventListener('blur', this.onEndChange, false);
      this.inputRef.addEventListener('keydown', this.escapeHandler, false);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onEndChange, false);
    if (this.inputRef) {
      this.inputRef.removeEventListener('blur', this.onEndChange, false);
      this.inputRef.removeEventListener('keydown', this.escapeHandler, false);
    }
  }

  onStartChange = () => {
    this.setState({ changing: true });
  }

  onChange = (e) => {
    this.props.onChange(e, e.target);
    if (!this.props.value) {
      this.setState({ value: e.target.value });
    }
  }

  onEndChange = (e) => {
    e.preventDefault();
    if (this.inputRef === e.target) return;
    document.removeEventListener('click', this.onEndChange, false);
    this.setState({ 
      changing: false,
      value: this.state.value ? this.state.value.trim() : undefined,
    });
  }

  escapeHandler = (e) => {
    if (e.keyCode === 27) {
      this.onEndChange(e);
    }
  }

  render() {
    const {
      name, 
      placeholder, 
      displayLabel, 
      maxLength, 
      fluid, 
      consoleFont = false, 
      disabled,
      disabledStyle = disabled,
      className = '',
      hint = "Click to Type",
    } = this.props;
    const { changing, value = this.props.value } = this.state;

    const text = value ? value.trim() : displayLabel;
    return (
      <form className={ className } onSubmit={ this.onEndChange }>
        { changing ?
          <input
            ref={ (ref) => { this.inputRef = ref; } }
            className={ styles.input }
            name={ name }
            value={ value }
            maxLength={ maxLength || 35 }
            onChange={ this.onChange }
            placeholder={ placeholder }
            data-fluid={ fluid }
          />
          :
          <div
            className={ cn(styles.linkStyled, { 
              [ styles.disabled ] : disabledStyle,
              [ styles.console ]: consoleFont,
            }) } 
            onClick={ disabled ? null : this.onStartChange } 
          > 
            {text}
          </div>
        }
      </form>
    );
  }
}
