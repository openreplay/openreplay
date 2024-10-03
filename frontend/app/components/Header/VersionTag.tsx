import { Space } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

const Logo = require('../../svg/logo-gray.svg').default;

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
