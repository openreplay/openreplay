import { Icon } from 'UI';
import styles from './itemMenu.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';

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
    const { items } = this.props;
    const { displayed } = this.state;

    return (
      <div className={ styles.wrapper }>
        <OutsideClickDetectingDiv 
          onClickOutside={ this.closeMenu }
        >
          <div
            ref={ (ref) => { this.menuBtnRef = ref; } }
            className={cn("w-10 h-10 cursor-pointer rounded-full flex items-center justify-center hover:bg-gray-light", { 'bg-gray-light' : displayed })}
            onClick={ this.toggleMenu }
            role="button"
          >
            <Icon name="ellipsis-v" size="16" />
          </div>
        </OutsideClickDetectingDiv>
        <div
          className={ styles.menu }
          data-displayed={ displayed }
        >
          { items.filter(({ hidden }) => !hidden).map(({ onClick, text, icon }) => (
            <div
              key={ text }
              className={ styles.menuItem }
              onClick={ this.onClick(onClick) }
              role="menuitem"
              tabIndex="-1"
            >
              { icon && (
                <div className={ styles.iconWrapper }>
                  <Icon name={ icon } size="13" color="gray-dark" />
                </div>
              )}
              <div>{ text }</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
