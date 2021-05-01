import React from 'react';
import { Icon } from 'UI';
import styles from './userItem.css';

const UserItem = ({ user, adminLabel, deleteHandler, editHandler }) => (
  <div className={ styles.wrapper } id="user-row">
    <Icon name="user-alt" size="16" marginRight="10" />
    <div id="user-name">{ user.name || user.email }</div>
    { adminLabel && <div className={ styles.adminLabel }>{ adminLabel }</div>}
    <div className={ styles.actions }>
      { !!deleteHandler &&
        <div className={ styles.button } onClick={ () => deleteHandler(user) } id="trash">
          <Icon name="trash" size="16" color="teal"/>
        </div>
      }
      { !!editHandler && 
        <div className={ styles.button } onClick={ () => editHandler(user) }>
          <Icon name="edit" size="16" color="teal"/>
        </div>
      }
    </div>
  </div>
);

export default UserItem;
