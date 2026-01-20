import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import { NavLink } from 'react-router-dom';
import { Icon } from 'UI';
import { useTheme } from 'App/ThemeContext';
import { mobileScreen } from '@/utils/isMobile';

const whiteLogo = new URL('../assets/logo-white.svg', import.meta.url);
const defaultLogo = new URL('../assets/logo.svg', import.meta.url);

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  const { theme } = useTheme();
  if (mobileScreen) {
    const icon = theme === 'dark' ? 'logo-small-white' : 'logo-small';
    return (
      <NavLink
        to={withSiteId(SESSIONS_PATH, props.siteId)}
        className="flex items-center"
      >
        <Icon name={icon} size={24} />
      </NavLink>
    );
  }
  return (
    <NavLink
      to={withSiteId(SESSIONS_PATH, props.siteId)}
      className="flex items-center"
    >
      <img src={theme === 'dark' ? whiteLogo : defaultLogo} width={120} />
    </NavLink>
  );
}

export default Logo;
