import { Icon } from 'UI';
import styles from './itemMenu.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';
import { Tooltip } from 'react-tippy';
export default class ItemMenu extends React.PureComponent {
  state = {
    displayed: false,
  };

  onClick = callback => (e) => {
    e.stopPropagation();
    callback(e);
  }

  toggleMenu = (e) => {
    this.setState({ displayed: !this.state.displayed });
  }

  closeMenu = () => this.setState({ displayed: false })

  render() {
    const { items, label = "" } = this.props;
    const { displayed } = this.state;

    return (
      <div className={ styles.wrapper }>
        <OutsideClickDetectingDiv 
          onClickOutside={ this.closeMenu }
        >
          <div onClick={ this.toggleMenu } className="flex items-center cursor-pointer">
            {label && <span className="mr-1 color-gray-medium ">{label}</span>}
            <div
              ref={ (ref) => { this.menuBtnRef = ref; } }
              className={cn("w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-light", { 'bg-gray-light' : displayed })}
              role="button"
            >
              <Icon name="ellipsis-v" size="16" />
            </div>
          </div>
        </OutsideClickDetectingDiv>
        <div
          className={ styles.menu }
          data-displayed={ displayed }
        >
          { items.filter(({ hidden }) => !hidden).map(({ onClick, text, icon, disabled = false, disabledMessage = '' }) => (
            <div
              key={ text }
              onClick={ !disabled ? this.onClick(onClick) : () => {} }
              role="menuitem"
              tabIndex="-1"
            >
              <Tooltip
                  delay={500}
                  arrow
                  title={ disabledMessage }
                  trigger="mouseenter"
                  position="left"
                  disabled={ !disabled }
              >
                  <div className={cn(styles.menuItem, {'disabled' : disabled })}>
                    { icon && (
                        <div className={ styles.iconWrapper }>
                          <Icon name={ icon } size="13" color="gray-dark" />
                        </div>
                      )}
                      <div>{ text }</div>
                  </div>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
