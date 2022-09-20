import React, { ReactNode } from 'react';
import { IconButton } from 'UI';
import cn from 'classnames';
import stl from './autoscroll.module.css';

interface Props {
  autoScrollTo?: number
  children: ReactNode[]
  className?: string
  navigation?: boolean
}

export default class Autoscroll extends React.PureComponent<Props, {
  autoScroll: boolean
  currentIndex?: number
}> {
  state = {
    autoScroll: true,
    currentIndex: 0,
  };
  scrollableElement = React.createRef<HTMLDivElement>()

  autoScroll(hard = false) {
    if (this.props.autoScrollTo !== undefined && this.props.autoScrollTo !== null && this.props.autoScrollTo >= 0) {
      // we have an element to scroll to
      this.scrollToElement(this.props.autoScrollTo, hard)
    } else if (this.scrollableElement.current) {
      // no element to scroll to, scroll to bottom
      this.scrollableElement.current.scrollTop = this.scrollableElement.current.scrollHeight;
    }
  }

  scrollToElement(elementIndex: number, hard = false) {
    if (!this.scrollableElement.current) {
      return;
    }

    if (this.scrollableElement.current.children.length < elementIndex || elementIndex < 0) {
      return;
    }

    const element = this.scrollableElement.current.children[elementIndex] as (HTMLElement | undefined)

    if (element) {
      if (this.scrollableElement.current.scrollTo && !hard) {
        this.scrollableElement.current.scrollTo({
          left: 0,
          top: element.offsetTop,
          behavior: 'smooth'
        })
      } else {
        this.scrollableElement.current.scrollTop = element.offsetTop;
      }
    }
  }

  componentDidMount() {
    if (!this.scrollableElement.current) return; // is necessary ?

    this.scrollableElement.current.addEventListener('scroll', this.scrollHandler);
    if (this.state.autoScroll) {
      this.setState({
        currentIndex: this.props.autoScrollTo
      })
      this.autoScroll(true)
    }
  }

  componentDidUpdate(nextProps: Props) {
    if (!this.scrollableElement) return; // is necessary ?

    if (this.state.autoScroll) {
      this.setState({
        currentIndex: this.props.autoScrollTo
      })
      this.autoScroll()
    }
  }

  scrollHandler = (e) => {
    if (!this.scrollableElement) return;
  };

  // TODO: Maybe make this handlers that allow the parent element to set a new autoscroll index
  onPrevClick = () => {
    if (!this.scrollableElement) return;

    const newIndex = Math.max(this.state.currentIndex - 1, 0)
    this.setState({
      autoScroll: false,
      currentIndex: newIndex
    })
    this.scrollToElement(newIndex)
  };

  onNextClick = () => {
    if (!this.scrollableElement) return;

    const newIndex = Math.min(this.state.currentIndex + 1, this.props.children.length - 1)
    this.setState({
      autoScroll: false,
      currentIndex: newIndex
    })
    this.scrollToElement(newIndex)
  };

  render() {
    const { className, navigation = false, children, ...props } = this.props;
    return (
      <div className={cn('relative w-full h-full', stl.wrapper)}>
        <div {...props} className={cn('relative scroll-y h-full', className)} ref={this.scrollableElement}>
          {children}
        </div>

        <div className={stl.navButtons}>
          {/* <label><input type={'checkbox'} checked={this.state.autoScroll} onChange={(e) => this.setState({ autoScroll: !this.state.autoScroll })} /> Autoscroll</label> */}
          {navigation && (
            <>
              <IconButton size="small" icon="chevron-up" onClick={this.onPrevClick} />
              <IconButton size="small" icon="chevron-down" onClick={this.onNextClick} className="mt-5" />
            </>
          )}
        </div>

      </div>
    );
  }
}
