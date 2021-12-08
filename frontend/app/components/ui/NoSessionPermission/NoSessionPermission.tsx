import React from 'react';
import stl from './NoSessionPermission.css'
import { Icon, Button, Link } from 'UI';
import { connect } from 'react-redux';

interface Props {
  session: any
}
function NoSessionPermission({ session }: Props) {
  return (
    <div className={stl.wrapper}>
      <Icon name="shield-lock" size="50" className="py-16"/>
      <div className={ stl.title }>Not allowed</div>
      { session.isLive ? 
        <span>This session is still live, and you don’t have the necessary permissions to access this feature. Please check with your admin.</span> :
        <span>You don’t have the necessary permissions to access this feature. Please check with your admin.</span>
      }
      <Link to="/">
        <Button primary className="mt-6">GO BACK</Button>
      </Link>
    </div>
  );
}

export default connect(state => ({
  session: state.getIn([ 'sessions', 'current' ]),
}))(NoSessionPermission);