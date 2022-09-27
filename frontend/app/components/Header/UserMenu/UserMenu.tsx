import React from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { logout } from 'Duck/user';
import { client, CLIENT_DEFAULT_TAB } from 'App/routes';
import cn from 'classnames';

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

interface Props {
  history: any;
  onLogoutClick: any;
  className: string;
}
function UserMenu(props: Props) {
  const onAccountClick = () => {
    props.history.push(CLIENT_PATH);
  };
  return (
    <div style={{ width: '250px' }} className={cn(props.className, "absolute right-0 top-0 bg-white border mt-14 shadow")}>
      <div className="flex items-center p-3">
        <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center mr-2 color-white">
          SS
        </div>
        <div>
          <div className="color-teal font-medium leading-none">User Name</div>
          <div className="color-gray-medium">Admin - admin@gmail.com</div>
        </div>
      </div>
      <div className="border-t">
        <button onClick={onAccountClick}>{'Account'}</button>
      </div>
      <div className="border-t">
        <button onClick={props.onLogoutClick}>{'Logout'}</button>
      </div>
    </div>
  );
}

export default withRouter(
  connect(
    (state: any) => ({
      //   account: state.getIn([ 'user', 'account' ]),
      //   siteId: state.getIn([ 'site', 'siteId' ]),
      //   sites: state.getIn([ 'site', 'list' ]),
      //   showAlerts: state.getIn([ 'dashboard', 'showAlerts' ]),
      //   boardingCompletion: state.getIn([ 'dashboard', 'boardingCompletion' ])
    }),
    { onLogoutClick: logout }
  )(UserMenu)
);

// export default UserMenu;
