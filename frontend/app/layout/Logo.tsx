import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import { NavLink } from 'react-router-dom';
import { Button } from 'antd';
import { Icon } from 'UI';

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  return (
    <NavLink
      to={withSiteId(SESSIONS_PATH, props.siteId)}
      className="flex items-center"
    >
      <Button type="link" className="p-0 flex items-center gap-2">
        <Icon name="logo-small" size={24} />
        <div className="text-black text-xl">Open Replay</div>
      </Button>
    </NavLink>
  );
}

export default Logo;
