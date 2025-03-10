import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { Dropdown, Button } from 'antd';
import { EllipsisVertical } from 'lucide-react';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';

interface Props {
  editHandler: (isTitle: boolean) => void;
  deleteHandler: any;
  renderReport: any;
}
function DashboardOptions(props: Props) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { isEnterprise } = userStore;
  const { editHandler, deleteHandler, renderReport } = props;

  const menu = {
    items: [
      {
        icon: <Icon name="pencil" />,
        key: 'rename',
        label: t('Rename'),
        onClick: () => editHandler(true),
      },
      {
        icon: <Icon name="users" />,
        key: 'visibility',
        label: t('Visibility & Access'),
        onClick: editHandler,
      },
      {
        icon: <Icon name="trash" />,
        key: 'delete',
        label: t('Delete'),
        onClick: deleteHandler,
      },
      {
        icon: <Icon name="pdf-download" />,
        key: 'download',
        label: t('Download Report'),
        onClick: renderReport,
        disabled: !isEnterprise,
        tooltipTitle: ENTERPRISE_REQUEIRED(t),
      },
    ],
  };

  return (
    <Dropdown menu={menu}>
      <Button
        type="text"
        id="ignore-prop"
        icon={<EllipsisVertical size={16} />}
      />
    </Dropdown>
  );
}

export default observer(DashboardOptions);
