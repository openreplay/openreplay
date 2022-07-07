import React from 'react';
import { Icon, Button } from 'UI';
import { validateKeyCode } from 'App/validate';
import styles from './tagInput.module.css';

class TagInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidUpdate() {
    const { tagEditorDisplayed } = this.props;
    if (tagEditorDisplayed && this.inputRef) {
      this.inputRef.focus();
      this.inputRef.addEventListener('keydown', this.escapeHandler, false);
    } else {
      this.inputRef.removeEventListener('keydown', this.escapeHandler);      
    }
  }

  escapeHandler = (e) => {
    if (e.keyCode === 27) {
      this.props.toggleTagEditor();
    }
  }

  handleKeyPress = (e) => {
    if (!validateKeyCode(e.keyCode, e.key, new RegExp('^[a-zA-Z0-9]+'))) {
      e.preventDefault();
      return;
    }

    // add tag on pressing Enter.
    if (e.key === 'Enter' && e.target.value.length > 0) {
      e.preventDefault();
      this.props.addTag(e.target.value);
      e.target.value = '';
    }
  }

  render() {
    const { toggleTagEditor, tagEditorDisplayed, placeholder = 'Tag' } = this.props;
    return (
      <div className={ styles.wrapper }>
        <div className={ styles.inputWrapper } data-hidden={ !tagEditorDisplayed } >
          <div>{ '#' }</div>
          <input
            type="text"
            ref={ (ref) => { this.inputRef = ref; } }
            onKeyPress={ this.handleKeyPress }
            placeholder={ placeholder }
          />
        </div>

        { tagEditorDisplayed &&
          <Button
            onClick={ toggleTagEditor }
          >
            { 'Cancel' }
          </Button>
        }

        { !tagEditorDisplayed &&
          <div ref={ (ref) => { this.addButtonRef = ref; } }>
            <div
              onClick={ toggleTagEditor }
              className="flex items-center cursor-pointer rounded p-2 gray-hover"
            >
              <Icon name="plus" color="teal" size="12" />
              <div className="ml-2 text-sm font-normal color-teal leading-none">ADD TAG</div>
            </div>           
          </div>
        }
      </div>
    );
  }
}

export default TagInput;
