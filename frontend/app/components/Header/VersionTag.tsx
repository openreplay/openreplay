import { Space } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

const Logo = new URL('../../svg/logo-gray.svg', import.meta.url);

function VersionTag() {
  const { userStore } = useStore();
  const version = userStore.account.versionNumber;

  return (
    <Space>
      <img src={Logo} width={20} />
      <div>{version}</div>
    </Space>
  );
}

export default observer(VersionTag);
