import React from 'react';
import { Icon, Popover, Tooltip } from 'UI';
import styles from './itemMenu.module.css';
import cn from 'classnames';

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
    const { items, label = '', bold, sm } = this.props;
    const { displayed } = this.state;
    const parentStyles = label ? 'rounded px-2 py-2 hover:bg-gray-light' : '';

    return (
      <Popover
        render={() => (
          <div
            className={cn(styles.menu, { [styles.menuDim]: !bold })}
            // data-displayed={displayed}
          >
            {items
              .filter(({ hidden }) => !hidden)
              .map(({ onClick, text, icon, disabled = false, tooltipTitle = '' }) => (
                <Tooltip disabled={!disabled} title={tooltipTitle} delay={0}>
                  <div
                    key={text}
                    onClick={!disabled ? this.onClick(onClick) : () => {}}
                    className={disabled ? 'cursor-not-allowed' : ''}
                    role="menuitem"
                  >
                    <div className={cn(styles.menuItem, 'text-neutral-700', { disabled: disabled })}>
                      {icon && (
                        <div className={styles.iconWrapper}>
                          {/* @ts-ignore */}
                          <Icon name={icon} size="13" color="gray-dark" />
                        </div>
                      )}
                      <div>{text}</div>
                    </div>
                  </div>
                </Tooltip>
              ))}
          </div>
        )}
      >
        <div
          // onClick={this.toggleMenu}
          className={cn(
            'flex items-center cursor-pointer select-none',
            !this.props.flat ? parentStyles : '',
            { 'bg-gray-light': !this.props.flat && displayed && label }
          )}
        >
          {label && (
            <span
              className={cn('mr-1', bold ? 'font-medium color-gray-darkest' : 'color-gray-medium')}
            >
              {label}
            </span>
          )}
          {this.props.flat ? null : (
            <div
              ref={(ref) => {
                this.menuBtnRef = ref;
              }}
              className={cn('rounded-full flex items-center justify-center', {
                'bg-gray-light': displayed,
                'w-10 h-10': !label && !sm,
                'w-8 h-8': sm,
              })}
              role="button"
            >
              <Icon name="ellipsis-v" size="16" />
            </div>
          )}
        </div>
      </Popover>
    );
  }
}
