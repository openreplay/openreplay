import React from 'react';
import cn from 'classnames'
import { Icon } from 'UI';
import styles from './listItem.css';

const ListItem = ({ field, onEdit, onDelete, disabled }) => {
  return (
    <div className={ cn(styles.wrapper, field.index === 0 ? styles.preDefined : '', { [styles.disabled] : disabled} ) } onClick={ () => field.index != 0 && onEdit(field) } >
      <span>{ field.key }</span>      
      <div className={ styles.actions } data-hidden={ field.index === 0}>
        <div className={ styles.button } onClick={ (e) => { e.stopPropagation(); onDelete(field) } }>
          <Icon name="trash" color="teal" size="16" />
        </div>
        <div className={ styles.button }>
          <Icon name="edit" color="teal" size="18"/>
        </div>
      </div>
    </div>
  );
};

export default ListItem;
