import React, { Component, createContext } from 'react';

const ModalContext = createContext({
  component: null,
  props: {},
  showModal: () => {},
  hideModal: () => {}
});

export class ModalProvider extends Component {
  showModal = (component, props = {}) => {
    this.setState({
      component,
      props
    });
  };

  hideModal = () =>
    this.setState({
      component: null,
      props: {}
    });

  state = {
    component: null,
    props: {},
    showModal: this.showModal,
    hideModal: this.hideModal
  };

  render() {
    return (
      <ModalContext.Provider value={this.state}>
        {this.props.children}
      </ModalContext.Provider>
    );
  }
}

export const ModalConsumer = ModalContext.Consumer;
