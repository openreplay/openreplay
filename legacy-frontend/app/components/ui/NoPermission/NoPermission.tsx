import React from 'react';
import stl from './noPermission.module.css'
import { Icon } from 'UI';

interface Props {
}
function NoPermission(props: Props) {
  return (
    <div className={stl.wrapper}>
      <Icon name="shield-lock" size="50" className="py-16"/>
      <div className={ stl.title }>Not allowed</div>
      You don’t have the necessary permissions to access this feature. Please check with your admin.
    </div>
  );
}

export default NoPermission;