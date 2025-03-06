import React from 'react';
import { ToastContainer, Flip } from 'react-toastify';
import styles from './notification.module.css';

export default function ({
  transition = Flip,
  position = 'bottom-right',
  autoClose = 3000,
  ...props
}) {
  return (
    <ToastContainer
      hideProgressBar
      position={position}
      draggable
      pauseOnHover
      transition={transition}
      autoClose={autoClose}
      className={styles.container}
      toastClassName={styles.toast}
      closeButton={false}
      {...props}
    />
  );
}
