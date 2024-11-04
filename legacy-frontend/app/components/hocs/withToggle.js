import React from 'react';
const withToggle = (stateName = 'open', handlerName = 'switchOpen', initial = false) => BaseComponent =>
  class extends React.Component {
    state = {
      toggle: initial,
    };

    onToggle = state => this.setState({
      toggle: typeof state === 'boolean' ? state : !this.state.toggle,
    })

    render() {
      const newProps = {
        [ handlerName ]: this.onToggle,
        [ stateName ]: this.state.toggle,
      };
      return <BaseComponent { ...newProps } { ...this.props } />;
    }
  };

export default withToggle;
