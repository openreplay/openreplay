import React from 'react';
import { Tooltip } from 'UI';
import { Button } from 'antd'
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached users limit.';

function AddUserButton({ isAdmin = false, onClick, btnVariant = 'primary' }: any) {
  const { userStore } = useStore();
  const limtis = useObserver(() => userStore.limits);
  const cannAddUser = useObserver(
    () => isAdmin && (limtis.teamMember === -1 || limtis.teamMember > 0)
  );
  return (
    <Tooltip
      title={`${!isAdmin ? PERMISSION_WARNING : !cannAddUser ? LIMIT_WARNING : 'Add team member'}`}
      disabled={isAdmin || cannAddUser}
    >
      <Button disabled={!cannAddUser || !isAdmin} type={btnVariant} onClick={onClick}>
        Add Team Member
      </Button>
    </Tooltip>
  );
}

export default AddUserButton;
