import styles from './slideModal.css';
import cn from 'classnames';
export default class SlideModal extends React.PureComponent {
  componentDidMount() {
    document.addEventListener('keydown', this.keyPressHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyPressHandler);
  }

  keyPressHandler = (e) => {
    if (e.key === 'Escape' && this.props.onClose) {
      this.props.onClose(false); // false for togglers (?)
    }
  }

  render() {
    const {
      title,
      subtitle,
      onClose,
      content,
      isDisplayed,
      size = 'big',
      detailContent,
      right = false,
      bgColor="white",
      overlay = true
    } = this.props;
    return (
      <div
        className={ cn(styles.main, right ? styles.right : styles.left) }
        data-displayed={ isDisplayed }
      >
        <div
          className={ cn( { [styles.overlay] : overlay }) }
          data-displayed={ isDisplayed }
          onClick={ onClose ? onClose : null }
          role="button"
        />

        <div className={ cn(styles.contentWrapper, 'bg-' + bgColor) } data-size={ size } >
          <div className={ cn(styles.mainPanel) }>
            { title &&
              <div className={ cn(styles.header, 'text-2xl') }>
                { title }
                { subtitle && <div className="text-sm mt-2">{ subtitle }</div>}
              </div>
            }
            { content }
          </div>
          <div className={ styles.detailContent } data-displayed={ !!detailContent } >
            { detailContent }
          </div>
        </div>

      </div>
    );
  }
}
