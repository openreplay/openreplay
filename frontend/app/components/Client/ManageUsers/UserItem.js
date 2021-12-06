import React from 'react';
import { Icon, CopyButton, Popup } from 'UI';
import styles from './userItem.css';

const UserItem = ({ user, adminLabel, deleteHandler, editHandler, generateInviteLink }) => (
  <div className={ styles.wrapper } id="user-row">
    <Icon name="user-alt" size="16" marginRight="10" />
    <div id="user-name">{ user.name || user.email }</div>
    <div className="px-2"/>
    { adminLabel && <div className={ styles.adminLabel }>{ adminLabel }</div>}
    { user.roleName && <div className={ styles.adminLabel }>{ user.roleName }</div>}
    <div className={ styles.actions }>
      { user.expiredInvitation && !user.joined &&
        <Popup
          trigger={
            <div className={ styles.button } onClick={ () => generateInviteLink(user) } id="trash">
              <Icon name="link-45deg" size="16" color="red"/>
            </div>
          }
          content={ `Generate Invitation Link` }
          size="tiny"
          inverted
          position="top center"
        />
      }
      { !user.expiredInvitation && !user.joined && user.invitationLink &&
        <Popup
          trigger={
            <div className={ styles.button }>
              <CopyButton
                content={user.invitationLink}
                className="link"
                btnText={<Icon name="link-45deg" size="16" color="teal"/>}
              />
            </div>
          }
          content={ `Copy Invitation Link` }
          size="tiny"
          inverted
          position="top center"
        />
      }
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
