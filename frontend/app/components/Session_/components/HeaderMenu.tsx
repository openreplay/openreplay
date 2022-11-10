import React from 'react';
import { Icon } from 'UI';
import styles from './menu.module.css';
import cn from 'classnames';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

interface MenuItem {
  key: number;
  component?: React.ReactElement;
}

interface Props {
  items: MenuItem[];
}

export default class ItemMenu extends React.PureComponent<Props> {
  state = {
    displayed: false,
  };

  handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && this.state.displayed && this.toggleMenu();

  componentDidMount() {
    document.addEventListener('keydown', this.handleEsc, false);
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEsc, false);
  }

  toggleMenu = () => {
    this.setState({ displayed: !this.state.displayed });
  };

  closeMenu = () => {
    this.setState({ displayed: false })
  }

  render() {
    const { items } = this.props;
    const { displayed } = this.state;

    return (
      <div className={styles.wrapper}>
        <OutsideClickDetectingDiv onClickOutside={this.closeMenu}>
        <div
          onClick={this.toggleMenu}
          className={cn(
            'flex items-center cursor-pointer select-none',
            'rounded p-2', displayed ? 'bg-gray-light' : 'hover:bg-gray-light-shade'
          )}
        >
          <div
            className={cn('rounded-full flex items-center justify-center', {
              'bg-gray-light': displayed,
            })}
            role="button"
          >
            <Icon name="ellipsis-v" size="16" />
          </div>
          <span className={'mr-1 text-disabled-text'}>More</span>
        </div>
        <div className={cn(styles.menu, styles.menuDim)} data-displayed={displayed}>
          {items.map((item) =>
            item.component ? (
              <div
                key={item.key}
                role="menuitem"
                className="hover:bg-gray-light-shade cursor-pointer flex items-center w-full"
              >
                {item.component}
              </div>
            ) : null
          )}
        </div>
        </OutsideClickDetectingDiv>
      </div>
    );
  }
}
