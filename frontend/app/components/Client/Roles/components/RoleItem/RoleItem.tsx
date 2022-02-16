import React from 'react'
import { Icon, Link } from 'UI'
import stl from './roleItem.css'
import cn from 'classnames'
import { CLIENT_TABS, client as clientRoute } from 'App/routes';


function PermisionLabel({ label }: any) {
  return (
    <div className={cn(stl.label, 'mb-2')}>{ label }</div>
  );
}

function PermisionLabelLinked({ label, route }: any) {
  return (
    <Link to={route}><div className={cn(stl.label, 'mb-2 bg-active-blue color-teal')}>{ label }</div></Link>
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
    <div className={cn('flex items-start relative py-4 hover border-b px-3 pr-20')}>
      <div className="flex" style={{ width: '20%'}}>
        <Icon name="user-alt" size="16" marginRight="10" />
        { role.name }
      </div>
      <div className="flex items-start flex-wrap" style={{ width: '30%'}}>
        {role.allProjects ? (
          <PermisionLabelLinked label="All projects" route={clientRoute(CLIENT_TABS.SITES)}/>
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
        <div className={ cn(stl.actions, 'absolute right-0 top-0 bottom-0 mr-8') }>
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