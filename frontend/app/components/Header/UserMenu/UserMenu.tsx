import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';
import { logout } from 'Duck/user';
import { client, CLIENT_DEFAULT_TAB } from 'App/routes';
import { Icon } from 'UI';
import cn from 'classnames';
import { getInitials } from 'App/utils';

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

interface Props {
  history: any;
  onLogoutClick?: any;
  className?: string;
  account: any;
}
function UserMenu(props: RouteComponentProps<Props>) {
  const { account, history, className, onLogoutClick }: any = props;

  const onAccountClick = () => {
    history.push(CLIENT_PATH);
  };
  return (
    <div

    >
      <div className="flex items-start p-3 border-b border-dashed hover:bg-active-blue cursor-pointer" onClick={onAccountClick}>
        <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center mr-2 color-white shrink-0 uppercase">
          {getInitials(account.name)}
        </div>
        <div className="overflow-hidden leading-8">
          <div className="color-teal font-medium leading-none capitalize">{account.name}</div>
          <div className="overflow-hidden whitespace-nowrap color-gray-medium text-ellipsis">
            {account.email}
          </div>
          <div className="rounded-full bg-gray-light flex items-center px-2 color-gray-medium text-sm w-fit text-center">
            {account.superAdmin ? 'Owner' : account.admin ? 'Admin' : 'Member'}
          </div>
        </div>
      </div>
      <div className="p-2">
        <div
          className="rounded border border-transparent p-2 cursor-pointer flex items-center hover:bg-active-blue hover:!border-active-blue-border hover-teal"
          onClick={onLogoutClick}
        >
          <Icon name="door-closed" size="16" />
          <button className="ml-2">{'Logout'}</button>
        </div>
      </div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    account: state.getIn(['user', 'account']),
  }),
  { onLogoutClick: logout }
)(withRouter(UserMenu)) as React.FunctionComponent<RouteComponentProps<Props>>;

// export default UserMenu;
