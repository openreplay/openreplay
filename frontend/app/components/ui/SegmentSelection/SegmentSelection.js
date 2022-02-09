import React from 'react';
import { Icon, Popup } from 'UI';
import cn from 'classnames';
import styles from './segmentSelection.css';

class SegmentSelection extends React.Component {
  setActiveItem = (item) => {
    this.props.onSelect(null, { name: this.props.name, value: item.value });
  }

  render() {
    const { className, list, small = false, extraSmall = false, primary = false, size = "normal" } = this.props;

    return (
      <div className={ cn(styles.wrapper, { 
          [styles.primary] : primary,
          [styles.small]  : size === 'small' || small,
          [styles.extraSmall]  : extraSmall,
        }, className) }
      >
        { list.map(item => (
          <Popup
            key={ item.name }
            trigger={
              <div
                className={ cn(styles.item, { 'opacity-25 cursor-default' : item.disabled }) }
                data-active={ this.props.value && this.props.value.value === item.value }
                onClick={ () => !item.disabled && this.setActiveItem(item) }
              >
                { item.icon && <Icon name={ item.icon } size="20" marginRight="10" /> }
                <div>{ item.name }</div>
              </div>
            }
            disabled={!item.disabled}
            content={ `Coming soon` }
            size="tiny"
            inverted
            position="top center"
          />
        ))
        }
      </div>
    );
  }
}

export default SegmentSelection;
