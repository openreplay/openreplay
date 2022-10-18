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
  onLogoutClick: any;
  className: string;
  account: any;
}
function UserMenu(props: RouteComponentProps<Props>) {
  const { account, history, className, onLogoutClick }: any = props;

  const onAccountClick = () => {
    history.push(CLIENT_PATH);
  };
  return (
    <div
      style={{ width: '250px' }}
      className={cn(className, 'absolute right-0 top-0 bg-white border mt-14')}
    >
      <div className="flex items-center p-3">
        <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center mr-2 color-white shrink-0">
          {getInitials(account.name)}
        </div>
        <div className="overflow-hidden">
          <div className="color-teal font-medium leading-none">{account.name}</div>
          <div className="overflow-hidden whitespace-nowrap color-gray-medium text-ellipsis">{account.superAdmin ? 'Super Admin' : (account.admin ? 'Admin' : 'Member') } - {account.email}</div>
        </div>
      </div>
      <div className="border-t flex items-center hover:bg-active-blue p-3" onClick={onAccountClick}>
        <Icon name="user-circle" size="16" />
        <button className="ml-2">{'Account'}</button>
      </div>
      <div className="border-t flex items-center hover:bg-active-blue p-3" onClick={onLogoutClick}>
        <Icon name="door-closed" size="16" />
        <button className="ml-2">{'Logout'}</button>
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
