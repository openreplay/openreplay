import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import styles from './segmentSelection.css';

class SegmentSelection extends React.Component {
  setActiveItem = (item) => {
    this.props.onSelect(null, { name: this.props.name, value: item.value });
  }

  render() {
    const { className, list, primary = false, size = "normal" } = this.props;

    return (
      <div className={ cn(styles.wrapper, { 
          [styles.primary] : primary,
          [styles.small]  : size === 'small'
        }, className) }
      >
        { list.map(item => (
          <div
            key={ item.name }
            className={ styles.item }
            data-active={ this.props.value && this.props.value.value === item.value }
            onClick={ () => this.setActiveItem(item) }
          >
            { item.icon && <Icon name={ item.icon } size="20" marginRight="10" /> }
            <div>{ item.name }</div>
          </div>
        ))
        }
      </div>
    );
  }
}

export default SegmentSelection;
