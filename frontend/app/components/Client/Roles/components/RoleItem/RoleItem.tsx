import React from 'react'
import { Icon } from 'UI'
import stl from './roleItem.css'
import cn from 'classnames'

function PermisionLabel({ label }: any) {
  return (
    <div className={cn(stl.label, 'mb-2')}>{ label }</div>
  );
}

interface Props {
  role: any,
  deleteHandler?: (role: any) => void,
  editHandler?: (role: any) => void,
  permissions: any,
  isAdmin: boolean,
  projects: any,
}
function RoleItem({ role, deleteHandler, editHandler, isAdmin, permissions, projects }: Props) {
  return (
    <div className={cn(stl.wrapper, 'flex items-start relative')}>
      <div className="flex" style={{ width: '20%'}}>
        <Icon name="user-alt" size="16" marginRight="10" />
        { role.name }
      </div>
      <div className="flex items-start flex-wrap" style={{ width: '30%'}}>
        {role.allProjects ? (
          <PermisionLabel label="All projects" />
        ) : (
          role.projects.map(p => (
            <PermisionLabel label={projects[p]} />
          ))
        )}
      </div>
      <div className="flex items-start flex-wrap" style={{ width: '50%'}}>
        {role.permissions.map((permission: any) => (
          <PermisionLabel label={permissions[permission]} key={permission.id} />
        ))}
      </div>

      { isAdmin && (
        <div className={ cn(stl.actions, 'absolute right-0 top-0 bottom-0') }>
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