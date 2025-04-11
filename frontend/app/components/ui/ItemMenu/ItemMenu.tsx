import React from 'react';
import { Icon, Popover } from 'UI';
import { Button, Tooltip } from 'antd';
import { EllipsisVertical } from 'lucide-react';
import cn from 'classnames';
import styles from './itemMenu.module.css';

interface Item {
  icon?: string;
  text: string;
  onClick: (args: any) => void;
  hidden?: boolean;
  disabled?: boolean;
  tooltipTitle?: string;
}

interface Props {
  bold?: boolean;
  flat?: boolean;
  items: Item[];
  label?: React.ReactNode;
  sm?: boolean;
  onToggle?: (args: any) => void;
  customTrigger?: React.ReactElement;
}

export default class ItemMenu extends React.PureComponent<Props> {
  menuBtnRef: HTMLDivElement = null;

  state = {
    displayed: false,
  };

  handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && this.closeMenu();

  componentDidMount() {
    document.addEventListener('keydown', this.handleEsc, false);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEsc, false);
  }

  onClick = (callback: Function) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    callback(e);
  };

  toggleMenu = () => {
    const shouldDisplay = !this.state.displayed;
    this.setState({ displayed: shouldDisplay });
    this.props.onToggle?.(shouldDisplay);
  };

  closeMenu = () => {
    this.setState({ displayed: false });
    this.props.onToggle?.(false);
  };

  render() {
    const { items, label, bold, sm } = this.props;
    const { displayed } = this.state;
    const parentStyles = label ? 'hover:bg-gray-light' : '';

    return (
      <Popover
        placement="bottom-end" // Set the placement to bottom-end for right alignment
        render={() => (
          <div
            className={cn(styles.menu, 'rounded-lg', {
              [styles.menuDim]: !bold,
            })}
          >
            {items
              .filter(({ hidden }) => !hidden)
              .map(
                ({
                  onClick,
                  text,
                  icon,
                  disabled = false,
                  tooltipTitle = '',
                }) => (
                  <Tooltip
                    key={text}
                    disabled={!disabled}
                    title={tooltipTitle}
                    delay={0}
                  >
                    <div
                      onClick={!disabled ? this.onClick(onClick) : () => {}}
                      className={`${disabled ? 'cursor-not-allowed' : ''}`}
                      role="menuitem"
                    >
                      <div className={cn(styles.menuItem, { disabled })}>
                        {icon && (
                          <div className={styles.iconWrapper}>
                            <Icon name={icon} size="13" color="gray-dark" />
                          </div>
                        )}
                        <div>{text}</div>
                      </div>
                    </div>
                  </Tooltip>
                ),
              )}
          </div>
        )}
      >
        {this.props.customTrigger ? (
          this.props.customTrigger
        ) : (
          <Button
            type="text"
            className={cn('select-none', !this.props.flat ? parentStyles : '', {
              '': !this.props.flat && displayed && label,
            })}
          >
            {label && <span className={cn('font-medium')}>{label}</span>}
            {!this.props.flat && (
              <div
                ref={(ref) => {
                  this.menuBtnRef = ref;
                }}
                className={cn('rounded-full flex items-center justify-center')}
                role="button"
              >
                <EllipsisVertical size={16} />
              </div>
            )}
          </Button>
        )}
      </Popover>
    );
  }
}
