import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import { NavLink } from 'react-router-dom';
import { Button } from 'antd';
import { Icon } from 'UI';
import { useTheme } from 'App/ThemeContext';

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  const { theme } = useTheme();
  const icon = theme === 'dark' ? 'logo-small-white' : 'logo-small';
  return (
    <NavLink
      to={withSiteId(SESSIONS_PATH, props.siteId)}
      className="flex items-center"
    >
      <Button type="link" className="p-0 flex items-center gap-2">
        <Icon name={icon} size={24} />
        <div className="hidden sm:block text-black text-2xl">{'OpenReplay'}</div>
      </Button>
    </NavLink>
  );
}

export default Logo;
