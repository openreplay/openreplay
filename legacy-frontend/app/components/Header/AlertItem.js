import React from 'react';
import { Icon } from 'UI';
import styles from './alertItem.module.css';

const AlertItem = ({ alert, onDelete, onEdit }) => (
  <div className={ styles.alertItem }>
    <div className={ styles.title }>{ alert.name }</div>
    <div className={ styles.period }>{ alert.period }</div>
    <div className={ styles.actions }>
      <Icon name="edit" size="16" onClick={ () => onEdit(alert) } />
      <Icon name="trash" size="16" onClick={ () => onDelete(alert.id) } />
    </div>
  </div>
);

export default AlertItem;
