//@ts-nocheck
import React, { Component, createContext } from 'react';
import Modal from './Modal';

const ModalContext = createContext({
    component: null,
    props: {
        right: true,
        onClose: () => {},
    },
    showModal: (component: any, props: any) => {},
    hideModal: () => {},
});

export class ModalProvider extends Component {
    handleKeyDown = (e: any) => {
        if (e.keyCode === 27) {
            this.hideModal();
        }
    };

    showModal = (component, props = { right: true }) => {
        this.setState({
            component,
            props,
        });
        document.addEventListener('keydown', this.handleKeyDown);
        document.querySelector('body').style.overflow = 'hidden';
    };

    hideModal = () => {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.querySelector('body').style.overflow = 'visible';
        const { props } = this.state;
        if (props.onClose) {
            props.onClose();
        }
        this.setState({
            component: null,
            props: {},
        });
    };

    state = {
        component: null,
        props: {},
        showModal: this.showModal,
        hideModal: this.hideModal,
    };

    render() {
        return (
            <ModalContext.Provider value={this.state}>
                <Modal {...this.state} />
                {this.props.children}
            </ModalContext.Provider>
        );
    }
}

export const ModalConsumer = ModalContext.Consumer;

export const useModal = () => React.useContext(ModalContext);
