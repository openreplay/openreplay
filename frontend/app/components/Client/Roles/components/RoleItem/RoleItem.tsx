import React from 'react';
import { Icon } from 'UI'
import stl from './roleItem.css'
import cn from 'classnames'

interface Props {
  role: any,
  deleteHandler?: (role: any) => void,
  editHandler?: (role: any) => void,
}
function RoleItem({ role, deleteHandler, editHandler }: Props) {
  return (
    <div className={cn(stl.wrapper)}>
      <Icon name="user-alt" size="16" marginRight="10" />
      <span>{ role.name }</span>

      <div className={ stl.actions }>
        { !!deleteHandler &&
          <div className={ cn(stl.button, {[stl.disabled] : role.protected }) } onClick={ () => deleteHandler(role) } id="trash">
            <Icon name="trash" size="16" color="teal"/>
          </div>
        }
        { !!editHandler && 
          <div className={ cn(stl.button, {[stl.disabled] : role.protected }) } onClick={ () => editHandler(role) }>
            <Icon name="edit" size="16" color="teal"/>
          </div>
        }
      </div>
    </div>
  );
}

export default RoleItem;