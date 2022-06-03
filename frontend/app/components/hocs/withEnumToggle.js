import React from 'react';
const withEnumToggle = (stateName = 'active', handlerName = 'setActive', initial) => BaseComponent =>
  class extends React.Component {
    state = {
      active: initial,
    };

    setActive = state => this.setState({
      active: state,
    })

    render() {
      const newProps = {
        [ handlerName ]: this.setActive,
        [ stateName ]: this.state.active,
      };
      return <BaseComponent { ...newProps } { ...this.props } />;
    }
  };

export default withEnumToggle;
