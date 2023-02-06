import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import ModalOverlay from './ModalOverlay';
import { useHistory } from 'react-router';

export default function Modal({ component, props, hideModal }: any) {
  const history = useHistory();

  useEffect(() => {
    return history.listen((location) => {
      if (history.action === 'POP') {
        document.querySelector('body').style.overflow = 'visible';
      }
    });
  });
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
