import React from 'react';
import { Icon, Tooltip } from 'UI';
import cn from 'classnames';
import {IconNames} from "UI/SVG";
import styles from './segmentSelection.module.css';

type Entry = { value: string, name: string, disabled?: boolean, icon?: IconNames };

interface Props<T extends Entry> {
    className?: string;
    name: string;
    value: T;
    list: T[];
    onSelect: (_: null, data: { name: string, value: T['value']}) => void;
    small?: boolean;
    extraSmall?: boolean;
    primary?: boolean;
    size?: 'normal' | 'small' | 'extraSmall';
    icons?: boolean;
    disabled?: boolean;
    disabledMessage?: string;
    outline?: boolean;
}

class SegmentSelection<T extends Entry> extends React.Component<Props<T>> {
  setActiveItem = (item: T) => {
    this.props.onSelect(null, { name: this.props.name, value: item.value });
  };

  render() {
    const {
      className,
      list,
      small = false,
      extraSmall = false,
      primary = false,
      size = 'normal',
      icons = false,
      disabled = false,
      disabledMessage = 'Not Allowed',
      outline,
    } = this.props;

    return (
      <Tooltip title={disabledMessage} disabled={!disabled}>
        <div
          className={cn(
            styles.wrapper,
            {
              [styles.primary]: primary,
              [styles.small]: size === 'small' || small,
              [styles.extraSmall]: size === 'extraSmall' || extraSmall,
              [styles.icons]: icons === true,
              [styles.disabled]: disabled,
              [styles.outline]: outline,
            },
            className
          )}
        >
          {list.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className={cn(styles.item, 'w-full', { 'opacity-25 cursor-default': item.disabled })}
              data-active={this.props.value && this.props.value.value === item.value}
              onClick={() => !item.disabled && this.setActiveItem(item)}
            >
              {item.icon && (
                <Icon
                  name={item.icon}
                  size={size === 'extraSmall' || size === 'small'  || icons  ? 14 : 20}
                  marginRight={item.name ? 6 : undefined}
                />
              )}
              <div className="leading-none">{item.name}</div>
            </div>
          ))}
        </div>
      </Tooltip>
    );
  }
}

export default SegmentSelection;
