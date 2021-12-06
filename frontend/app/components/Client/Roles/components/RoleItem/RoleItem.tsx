import React from 'react'
import { Icon } from 'UI'
import stl from './roleItem.css'
import cn from 'classnames'

function PermisionLabel({ permission }: any) {
  return (
    <div className={cn(stl.label)}>{ permission }</div>
  );
}

interface Props {
  role: any,
  deleteHandler?: (role: any) => void,
  editHandler?: (role: any) => void,
  permissions: any,
  isAdmin: boolean
}
function RoleItem({ role, deleteHandler, editHandler, isAdmin, permissions }: Props) {
  return (
    <div className={cn(stl.wrapper)}>
      <Icon name="user-alt" size="16" marginRight="10" />
      <div className="flex items-center">
        <div className="mr-4">{ role.name }</div>
        <div className="grid grid-flow-col auto-cols-max">
          {role.permissions.map((permission: any) => (
            <PermisionLabel permission={permissions[permission]} key={permission.id} />
            // <span key={permission.id} className={cn(stl.permission)}>{ permissions[permission].name }</span>
          ))}
        </div>
      </div>
      { isAdmin && (
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
      )}

    </div>
  );
}

export default RoleItem;