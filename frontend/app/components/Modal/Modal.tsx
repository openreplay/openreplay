import React from 'react';
import ReactDOM from 'react-dom';
import ModalOverlay from './ModalOverlay';

export default function Modal({ component, props, hideModal }: any) {
    return component ? (
        ReactDOM.createPortal(
            <ModalOverlay hideModal={hideModal} left={!props.right} right={props.right}>
                {component}
            </ModalOverlay>,
            document.querySelector('#modal-root')
        )
    ) : (
        <></>
    );
}
