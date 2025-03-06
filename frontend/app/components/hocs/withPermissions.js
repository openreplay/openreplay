import { useStore } from 'App/mstore';
import React from 'react';
import { NoPermission, NoSessionPermission } from 'UI';
import { observer } from 'mobx-react-lite';

export default (
    requiredPermissions,
    className,
    isReplay = false,
    andEd = true,
  ) =>
  (BaseComponent) => {
    function WrapperClass(props) {
      const { userStore } = useStore();
      const permissions = userStore.account.permissions ?? [];
      const { isEnterprise } = userStore;
      const hasPermission = andEd
        ? requiredPermissions.every((permission) =>
            permissions.includes(permission),
          )
        : requiredPermissions.some((permission) =>
            permissions.includes(permission),
          );

      return !isEnterprise || hasPermission ? (
        <BaseComponent {...props} />
      ) : (
        <div className={className}>
          {isReplay ? <NoSessionPermission /> : <NoPermission />}
        </div>
      );
    }
    return observer(WrapperClass);
  };
