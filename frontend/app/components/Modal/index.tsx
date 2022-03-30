import React, { Component, createContext } from 'react';
import Modal from './Modal';

const ModalContext = createContext({
  component: null,
  props: {},
  showModal: (component: any, props: any) => {},
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
        <Modal />
        {this.props.children}
      </ModalContext.Provider>
    );
  }
}

export const ModalConsumer = ModalContext.Consumer;

export const useModal = () => React.useContext(ModalContext);