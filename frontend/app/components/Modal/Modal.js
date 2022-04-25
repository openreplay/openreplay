import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useModal } from '.';
import ModalOverlay from './ModalOverlay';

export default function Modal({ children }){
  const { component } = useModal();

  return component ? ReactDOM.createPortal(
    <ModalOverlay>
      {component}
    </ModalOverlay>,
    document.querySelector("#modal-root"),
  ) : null;
}