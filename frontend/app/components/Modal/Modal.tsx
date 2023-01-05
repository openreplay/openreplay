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
  });

  return component ? (
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

Modal.Header = ({ title, children }: { title?: string, children?: any }) => {
  return !!children ? (
    <div>
      {children}
    </div>
  ): (
    <div className="text-lg flex items-center p-4 font-medium">
      <div>{title}</div>
    </div>
  );
};

Modal.Content = ({ children, className = 'p-4' }: { children: any; className?: string }) => {
  return (
    <div
      className={cn('overflow-y-auto relative', className)}
      style={{ height: 'calc(100vh - 52px)' }}
    >
      {children}
    </div>
  );
};

Modal.Footer = ({ children, className = '' }: any) => {
  return (
    <div className={cn('absolute bottom-0 w-full left-0 right-0', className)} style={{}}>
      {children}
    </div>
  );
};

export default Modal;
