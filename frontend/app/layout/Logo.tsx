import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NavLink } from 'react-router-dom';
import { Tooltip } from 'antd';

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  return (
    <NavLink to={withSiteId(SESSIONS_PATH, props.siteId)}>
      <Tooltip title={`v${window.env.VERSION}`}>
        <div>
          <AnimatedSVG name={ICONS.LOGO_SMALL} size='30' />
        </div>
      </Tooltip>
    </NavLink>
  );
}

export default Logo;