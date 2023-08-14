import React from 'react';
import { sessions, withSiteId } from 'App/routes';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NavLink } from 'react-router-dom';
import { Button } from 'antd';

const SESSIONS_PATH = sessions();

interface Props {
  siteId: any;
}

function Logo(props: Props) {
  return (
    <NavLink to={withSiteId(SESSIONS_PATH, props.siteId)}>
      <Button type='link' className='p-0'>
        <AnimatedSVG name={ICONS.LOGO_FULL} size='120' />
      </Button>
    </NavLink>
  );
}

export default Logo;