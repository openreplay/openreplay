import React from 'react';
import { ToastContainer, Flip } from 'react-toastify';
import styles from './notification.module.css';

export default function ({
  transition = Flip,
  position = 'bottom-right',
  ...props
}) {
  return (
    <ToastContainer
      position={position}
      pauseOnHover
      transition={transition}
      autoClose={3000}
      className={styles.container}
      toastClassName={styles.toast}
      closeButton={false}
      {...props}
    />
  );
}
