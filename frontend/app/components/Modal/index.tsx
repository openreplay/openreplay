//@ts-nocheck
import React, { Component, createContext } from 'react';
import Modal from './Modal';

const ModalContext = createContext({
  component: null,
  props: {
    right: false,
  },
  showModal: (component: any, props: any) => {},
  hideModal: () => {}
});

export class ModalProvider extends Component {

  handleKeyDown = (e: any) => {
    if (e.keyCode === 27) {
      this.hideModal();
    }
  }

  showModal = (component, props = {}) => {
    this.setState({
      component,
      props
    });
    document.addEventListener('keydown', this.handleKeyDown);
  };

  hideModal = () => {
    this.setState({
      component: null,
      props: {}
    });
    document.removeEventListener('keydown', this.handleKeyDown);
  }

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
