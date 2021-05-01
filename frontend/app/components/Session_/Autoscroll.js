import { IconButton } from 'UI';
import cn from 'classnames';
import stl from './autoscroll.css';

export default class Autoscroll extends React.PureComponent {
  static defaultProps = {
    bottomOffset: 10,
  }
  state = {
    autoScroll: true,
  }

  componentDidMount() {
    if (!this.scrollableElement) return; // is necessary ?
    this.scrollableElement.addEventListener('scroll', this.scrollHandler);
    this.scrollableElement.scrollTop = this.scrollableElement.scrollHeight;
  }

  componentDidUpdate() {
    if (!this.scrollableElement) return; // is necessary ?
    if (this.state.autoScroll) {
      this.scrollableElement.scrollTop = this.scrollableElement.scrollHeight;
    }
  }

  scrollHandler = (e) => {
    if (!this.scrollableElement) return;
    this.setState({ 
      autoScroll: this.scrollableElement.scrollHeight 
        - this.scrollableElement.clientHeight 
        - this.scrollableElement.scrollTop < this.props.bottomOffset,
    });
  }

  onPrevClick = () => {
    if (!this.scrollableElement) return;
    const scEl = this.scrollableElement;
    let prevItem;
    for (let i = scEl.children.length - 1; i >= 0; i--) {
      const child = scEl.children[ i ];
      const isScrollable = child.getAttribute("data-scroll-item") === "true";
      if (isScrollable && child.offsetTop < scEl.scrollTop) {
        prevItem = child;
        break;
      }
    }
    if (!prevItem) return;
    scEl.scrollTop = prevItem.offsetTop;
  }

  onNextClick = () => {
    if (!this.scrollableElement) return;
    const scEl = this.scrollableElement;
    let nextItem;
    for (let i = 0; i < scEl.children.length; i++) {
      const child = scEl.children[ i ];
      const isScrollable = child.getAttribute("data-scroll-item") === "true";
      if (isScrollable && child.offsetTop > scEl.scrollTop + 20) { // ?
        nextItem = child;
        break;
      }
    }
    if (!nextItem) return;
    scEl.scrollTop = nextItem.offsetTop;
  }

  render() {
    const { className, navigation=false, children, ...props } = this.props;
    return (
      <div className={ cn("relative w-full h-full", stl.wrapper) } >
        <div 
          { ...props }
          className={ cn("relative scroll-y h-full", className) }
          ref={ ref => this.scrollableElement = ref }
        >
          { children }
        </div>
        { navigation && 
          <div className={ stl.navButtons } >
            <IconButton size="small" icon="chevron-up" onClick={this.onPrevClick} />
            <IconButton size="small" icon="chevron-down" onClick={this.onNextClick} className="mt-5" />
          </div>
        }
      </div>
    );
  }
}