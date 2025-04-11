import React from 'react';
import { Icon, Link } from 'UI';
import { Button } from 'antd';
import cn from 'classnames';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import stl from './roleItem.module.css';
import { useTranslation } from 'react-i18next';

function PermisionLabel({ label }: any) {
  return <div className={cn(stl.label, 'mb-2')}>{label}</div>;
}

function PermisionLabelLinked({ label, route }: any) {
  return (
    <Link to={route}>
      <div className={cn(stl.label, 'mb-2 bg-active-blue color-teal')}>
        {label}
      </div>
    </Link>
  );
}

interface Props {
  role: any;
  editHandler?: (role: any) => void;
  permissions: any;
  isAdmin: boolean;
  projects: any;
}
function RoleItem({
  role,
  editHandler,
  isAdmin,
  permissions,
  projects,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-start relative py-4 hover border-b last:border-none px-5 pr-20 group',
      )}
    >
      <div className="flex" style={{ width: '20%' }}>
        <Icon name="user-alt" size="16" className="mr-2" />
        {role.name}
      </div>
      <div className="flex items-start flex-wrap" style={{ width: '30%' }}>
        {role.allProjects ? (
          <PermisionLabelLinked
            label={t('All projects')}
            route={clientRoute(CLIENT_TABS.SITES)}
          />
        ) : (
          role.projects.map((p: any) => <PermisionLabel label={projects[p]} />)
        )}
      </div>
      <div className="flex items-start flex-wrap" style={{ width: '50%' }}>
        <div className="flex items-center flex-wrap">
          {role.permissions.map((permission: any) => (
            <PermisionLabel label={permissions[permission]} key={permission} />
          ))}
        </div>

        <div
          className={cn(
            stl.actions,
            'absolute right-0 top-0 bottom-0 mr-8 invisible group-hover:visible',
          )}
        >
          {isAdmin && !!editHandler && (
            <Button
              type="text"
              icon={<Icon name="pencil" />}
              disabled={role.protected}
              onClick={() => editHandler(role)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleItem;
