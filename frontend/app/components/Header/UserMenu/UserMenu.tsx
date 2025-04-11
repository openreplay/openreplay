import React from 'react';
import { withRouter } from 'react-router-dom';
import { client, CLIENT_DEFAULT_TAB } from 'App/routes';
import { Icon } from 'UI';
import { getInitials } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

interface Props {
  history: any;
}
function UserMenu(props: Props) {
  const { t } = useTranslation();
  const { history }: any = props;
  const { loginStore, userStore } = useStore();
  const { account } = userStore;
  const onLogoutClick = userStore.logout;

  const onAccountClick = () => {
    history.push(CLIENT_PATH);
  };

  const onLogout = () => {
    loginStore.invalidateSpotJWT();
    window.postMessage(
      {
        type: 'orspot:invalidate',
      },
      '*',
    );
    void onLogoutClick();
  };
  return (
    <div>
      <div
        className="flex items-start p-3 border-b border-dashed hover:bg-active-blue cursor-pointer"
        onClick={onAccountClick}
      >
        <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center mr-2 color-white shrink-0 uppercase">
          {getInitials(account.name)}
        </div>
        <div className="overflow-hidden leading-8">
          <div className="color-teal font-medium leading-none capitalize">
            {account.name}
          </div>
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
          onClick={onLogout}
        >
          <Icon name="door-closed" size="16" />
          <button className="ml-2">{t('Logout')}</button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(observer(UserMenu));
