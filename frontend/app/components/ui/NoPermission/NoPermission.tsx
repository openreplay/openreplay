import React from 'react';
import stl from './noPermission.css'
import { Icon, Button, Link } from 'UI';

interface Props {
  backLink: string
}
function NoPermission({ backLink }: Props) {
  return (
    <div className={stl.wrapper}>
      <Icon name="shield-lock" size="50" className="py-16"/>
      <div className={ stl.title }>Not allowed</div>
      You don’t have the necessary permissions to access this feature. Please check with your admin.
      {backLink && (
        <Link to={backLink}>
          <Button primary className="mt-6">GO BACK</Button>
        </Link>
      )}
    </div>
  );
}

export default NoPermission;