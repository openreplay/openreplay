import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';

import NoPermission from 'Shared/NoPermission/NoPermission';
import NoSessionPermission from 'Shared/NoPermission/NoSessionPermission';

export default (
    requiredPermissions,
    className,
    isReplay = false,
    matchAll = true,
  ) =>
  (BaseComponent) => {
    function WrapperClass(props) {
      const { userStore } = useStore();
      const permissions = userStore.account.permissions ?? [];
      const { isEnterprise } = userStore;
      const isAdmin = userStore.isAdmin;
      const hasPermission = matchAll
        ? requiredPermissions.every((permission) =>
            permissions.includes(permission),
          )
        : requiredPermissions.some((permission) =>
            permissions.includes(permission),
          );

      return isAdmin || !isEnterprise || hasPermission ? (
        <BaseComponent {...props} />
      ) : (
        <div className={className}>
          {isReplay ? <NoSessionPermission /> : <NoPermission />}
        </div>
      );
    }
    return observer(WrapperClass);
  };
