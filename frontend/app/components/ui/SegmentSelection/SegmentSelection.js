import React from 'react';
import { Icon, Popup } from 'UI';
import cn from 'classnames';
import styles from './segmentSelection.module.css';

class SegmentSelection extends React.Component {
  setActiveItem = (item) => {
    this.props.onSelect(null, { name: this.props.name, value: item.value });
  }

  render() {
    const { className, list, small = false, extraSmall = false, primary = false, size = "normal", icons = false, disabled = false, disabledMessage = 'Not Allowed', outline } = this.props;

    return (
      <Popup
        content={disabledMessage}
        disabled={!disabled}
      >
        <div className={ cn(styles.wrapper, { 
            [styles.primary] : primary,
            [styles.small]  : size === 'small' || small,
            [styles.extraSmall]  : size === 'extraSmall' || extraSmall,
            [styles.icons]  : icons === true,
            [styles.disabled] : disabled,
            [styles.outline]: outline,
          }, className) }
        >
          { list.map(item => (
              <div
                key={ item.name }
                className={ cn(styles.item, 'w-full', { 'opacity-25 cursor-default' : item.disabled }) }
                data-active={ this.props.value && this.props.value.value === item.value }
                onClick={ () => !item.disabled && this.setActiveItem(item) }
              >
                { item.icon && <Icon name={ item.icon } size={(size === "extraSmall" || icons) ? 14 : 20} marginRight={ item.name ? "6" : "" } /> }
                <div className="leading-none">{ item.name }</div>
              </div>
          ))
          }
        </div>
      </Popup>
    );
  }
}

export default SegmentSelection;
