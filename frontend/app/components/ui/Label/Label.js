import React from 'react';
import { Label } from 'semantic-ui-react';
import styles from './label.module.css';
import cn from 'classnames';

export default ({
  children, className, ...props
}) => (
  <Label
    { ...props }
    className={ cn(className, styles.label, 'border') }
  >
    { children }
  </Label>
);
