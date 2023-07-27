import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NavLink } from 'react-router-dom';

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  return (
    <NavLink to={withSiteId(SESSIONS_PATH, props.siteId)}>
      <div className='relative select-none'>
        <div className=''>
          <AnimatedSVG name={ICONS.LOGO_SMALL} size='30' />
        </div>
        <div className='absolute bottom-0' style={{ fontSize: '7px', right: '-12px', bottom: '-15px' }}>
          v{window.env.VERSION}
        </div>
      </div>
    </NavLink>
  );
}

export default Logo;