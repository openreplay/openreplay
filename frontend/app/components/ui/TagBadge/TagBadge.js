import cn from 'classnames';
import styles from './tagBadge.css';

export default class TagBadge extends React.PureComponent {

  onClick = () => {
    if (this.props.onClick) {
      this.props.onClick(this.props.text);
    }
  }

  render() {
    const {
      className, text, onRemove, onClick, hashed = true, outline = false,
    } = this.props;
    return (
      <div
        className={ cn(styles.badge, { "cursor-pointer": !!onClick }, className) }
        onClick={ this.onClick }
        data-hashed={ hashed }
        data-outline={ outline }
      >
        <span>{ text }</span>
        { onRemove &&
          <button type="button" onClick={ onRemove }>
            <i className={ styles.closeIcon } />
          </button>
        }
      </div>
    );
  }
}
