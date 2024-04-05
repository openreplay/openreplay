import React from 'react';
import { Button, Icon } from 'UI';
import styles from './menu.module.css';
import cn from 'classnames';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

interface MenuItem {
  key: number;
  autoclose?: boolean;
  component?: React.ReactElement;
}

interface Props {
  items: MenuItem[];
  useSc?: boolean;
}

export default class ItemMenu extends React.PureComponent<Props> {
  state = {
    displayed: false,
  };

  handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && this.state.displayed && this.toggleMenu();
  handleSc = (e: KeyboardEvent) => e.key === 'M' && e.shiftKey ? this.toggleMenu() : null;

  componentDidMount() {
    document.addEventListener('keydown', this.handleEsc, false);
    if (this.props.useSc) {
      document.addEventListener('keydown', this.handleSc, false)
    }
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEsc, false);
    if (this.props.useSc) {
      document.removeEventListener('keydown', this.handleSc, false)
    }
  }

  toggleMenu = () => {
    this.setState({ displayed: !this.state.displayed });
  };

  closeMenu = () => {
    this.setState({ displayed: false });
  };

  render() {
    const { items } = this.props;
    const { displayed } = this.state;

    return (
      <div className={styles.wrapper}>
        <OutsideClickDetectingDiv onClickOutside={this.closeMenu}>
          <Button variant="text" onClick={this.toggleMenu}>
            <div className="flex items-center">
              <Icon name="ellipsis-v" size={18} className="mr-1" />
              <span>More</span>
            </div>
          </Button>
          <div className={cn(styles.menu, styles.menuDim)} data-displayed={displayed}>
            {items.map((item) =>
              item.component ? (
                <div
                  key={item.key}
                  onClick={item.autoclose ? this.closeMenu : undefined}
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
