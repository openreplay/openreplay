import React from 'react';
import ReactDOM from 'react-dom';
import { useModal } from '.';
import ModalOverlay from './ModalOverlay';

export default function Modal() {
  const { component, props} = useModal();

  return component ? ReactDOM.createPortal(
    <ModalOverlay left={!props.right} right={props.right}>
      {component}
    </ModalOverlay>,
    document.querySelector("#modal-root"),
  ) : null;
}