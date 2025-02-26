import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { Dropdown, Button } from 'antd';
import { EllipsisVertical } from 'lucide-react';
import { Icon } from 'UI';

interface Props {
  editHandler: (isTitle: boolean) => void;
  deleteHandler: any;
  renderReport: any;
}
function DashboardOptions(props: Props) {
  const { userStore } = useStore();
  const { isEnterprise } = userStore;
  const { editHandler, deleteHandler, renderReport } = props;

  const menu = {
    items: [
      {
        icon: <Icon name="pencil" />,
        key: 'rename',
        label: 'Rename',
        onClick: () => editHandler(true),
      },
      {
        icon: <Icon name="users" />,
        key: 'visibility',
        label: 'Visibility & Access',
        onClick: editHandler,
      },
      {
        icon: <Icon name="trash" />,
        key: 'delete',
        label: 'Delete',
        onClick: deleteHandler,
      },
      {
        icon: <Icon name="pdf-download" />,
        key: 'download',
        label: 'Download Report',
        onClick: renderReport,
        disabled: !isEnterprise,
        tooltipTitle: ENTERPRISE_REQUEIRED,
      },
    ],
  };

  return (
    <Dropdown menu={menu}>
      <Button type="text" id="ignore-prop" icon={<EllipsisVertical size={16} />} />
    </Dropdown>
  );
}

export default observer(DashboardOptions);
