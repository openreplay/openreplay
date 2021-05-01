import React from 'react';
import { Icon } from 'UI';
import styles from './listItem.css';

const ListItem = ({ webhook, onEdit, onDelete }) => {
  return (
    <div className={ styles.wrapper } onClick={ onEdit }>
      <div>
        <span>{ webhook.name }</span>        
        <div className={ styles.endpoint }>{ webhook.endpoint }</div>
      </div>
      <div className={ styles.actions }>
        <div className={ styles.button } onClick={ (e) => { e.stopPropagation(); onDelete(webhook) } }>
          <Icon name="trash" color="teal" size="16" />
        </div>
        <div className={ styles.button }>
          <Icon name="edit" color="teal" size="16" />
        </div>
      </div>
    </div>
  );
};

export default ListItem;