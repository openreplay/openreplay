import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import ModalOverlay from './ModalOverlay';
import cn from 'classnames';
import { useHistory } from 'react-router';

const DEFAULT_WIDTH = 350;
interface Props {
  component: any;
  className?: string;
  props: any;
  hideModal?: boolean;
  width?: number;
}
function Modal({ component, className = 'bg-white', props, hideModal }: Props) {
  const history = useHistory();

  useEffect(() => {
    return history.listen((location) => {
      if (history.action === 'POP') {
        document.querySelector('body').style.overflow = 'visible';
      }
    });
  });return component ? (
    ReactDOM.createPortal(
      <ModalOverlay hideModal={hideModal} left={!props.right} right={props.right}>
        <div
          className={className}
          style={{ width: `${props.width ? props.width : DEFAULT_WIDTH}px` }}
        >
          {component}
        </div>
      </ModalOverlay>,
      document.querySelector('#modal-root')
    )
  ) : (
    <></>
  );
}

Modal.Header = ({ title }: { title: string }) => {
  return (
    <div className="text-lg flex items-center p-4 font-medium">
      <div>{title}</div>
    </div>
  );
};

Modal.Content = ({ children, className = 'p-4' }: { children: any; className?: string }) => {
  return <div className={cn('h-screen overflow-y-auto', className)}>{children}</div>;
};

export default Modal;
