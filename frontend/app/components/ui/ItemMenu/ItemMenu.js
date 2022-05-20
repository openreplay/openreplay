import { Icon } from 'UI';
import styles from './itemMenu.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';
import { Tooltip } from 'react-tippy';

export default class ItemMenu extends React.PureComponent {
  state = {
    displayed: false,
  };

  handleEsc = (e) => e.key === 'Escape' && this.closeMenu()

  componentDidMount() {
    document.addEventListener("keydown", this.handleEsc, false);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleEsc, false);
  }

  onClick = callback => (e) => {
    e.stopPropagation();
    callback(e);
  }

  toggleMenu = (e) => {
    this.setState({ displayed: !this.state.displayed });
  }

  closeMenu = () => this.setState({ displayed: false })

  render() {
    const { items, label = "", bold } = this.props;
    const { displayed } = this.state;
    const parentStyles = label ? 'rounded px-2 py-1 hover:bg-gray-light' : '';

    return (
      <div className={ styles.wrapper }>
        <OutsideClickDetectingDiv
          onClickOutside={ this.closeMenu }
        >
          <div
            onClick={ this.toggleMenu }
            className={cn("flex items-center cursor-pointer select-none", parentStyles, { 'bg-gray-light' : displayed && label })}
          >
            {label && <span className={cn('mr-1', bold ? 'font-medium color-gray-darkest' : 'color-gray-medium')}>{label}</span>}
            <div
              ref={ (ref) => { this.menuBtnRef = ref; } }
              className={cn("rounded-full flex items-center justify-center", { 'bg-gray-light' : displayed, "w-10 h-10" : !label })}
              role="button"
            >
              <Icon name="ellipsis-v" size="16" />
            </div>
          </div>
        </OutsideClickDetectingDiv>
        <div
          className={ cn(styles.menu, { [styles.menuDim]: !bold }) }
          data-displayed={ displayed }
        >
          { items.filter(({ hidden }) => !hidden).map(({ onClick, text, icon, disabled = false, disabledMessage = '' }) => (
            <div
              key={ text }
              onClick={ !disabled ? this.onClick(onClick) : () => {} }
              role="menuitem"
              tabIndex="-1"
              className=""
            >
              <Tooltip
                  delay={500}
                  arrow
                  title={ disabledMessage }
                  trigger="mouseenter"
                  position="left"
                  disabled={ !disabled }
              >
                  <div className={cn(styles.menuItem, 'text-neutral-700', {'disabled' : disabled })}>
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
