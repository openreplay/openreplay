import { Icon } from 'UI';
import styles from './itemMenu.css';

export default class ItemMenu extends React.PureComponent {
  state = {
    displayed: false,
  };

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  onClick = callback => (e) => {
    e.stopPropagation();
    callback(e);
  }

  handleClickOutside = (e) => {
    if (!this.state.displayed) return;
    if (e.target !== this.menuBtnRef) {
      this.closeMenu();
    }
  }

  toggleMenu = (e) => {
    e.stopPropagation();
    this.setState({ displayed: !this.state.displayed });
  }

  closeMenu = () => this.setState({ displayed: false })

  render() {
    const { items } = this.props;
    const { displayed } = this.state;

    return (
      <div className={ styles.wrapper }>
        {/* <div
          ref={ (ref) => { this.menuBtnRef = ref; } }
          className={ styles.menuBtn }
          onClick={ this.toggleMenu }
          role="button"
          tabIndex="-1"
        /> */}
        <div
          ref={ (ref) => { this.menuBtnRef = ref; } }
          className="w-10 h-10 cursor-pointer bg-white rounded-full flex items-center justify-center hover:bg-gray-lightest"
          onClick={ this.toggleMenu }
          role="button"
          tabIndex="-1"
        >
          <Icon name="ellipsis-v" size="16" />
        </div>
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
