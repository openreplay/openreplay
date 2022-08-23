import React from 'react';
import { Popup } from 'UI';

interface Props {
  timeout: number
  position: string
  tooltip: string
  trigger: React.ReactNode
}

export default class Tooltip extends React.PureComponent<Props> {
  static defaultProps = {
    timeout: 500,
  }
  state = {
    open: false,
  }
  mouseOver = false
  onMouseEnter = () => {
    this.mouseOver = true;
    setTimeout(() => {
      if (this.mouseOver) this.setState({ open: true });
    }, this.props.timeout)
  }
  onMouseLeave = () => {
    this.mouseOver = false;
    this.setState({
      open: false,
    });
  }

  render() {
    const { trigger, tooltip, position } = this.props;
    const { open } = this.state;
    return (
      <Popup
        open={open}
        content={tooltip}
        disabled={!tooltip}
        position={position}
      >
        <span //TODO: no wrap component around
            onMouseEnter={ this.onMouseEnter }
            onMouseLeave={ this.onMouseLeave }
        >
            { trigger }
        </span>
      </Popup>
    );
  }
}