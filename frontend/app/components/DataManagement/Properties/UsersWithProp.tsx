import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import UsersList from '../UsersEvents/components/UsersList';
import { useHistory } from 'react-router';
import { dataManagement, withSiteId } from '@/routes';

function UsersWithProp({ propName }: { propName: string }) {
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const { t } = useTranslation();

  const toUser = (id: string) =>
    history.push(withSiteId(dataManagement.userPage(id), siteId!));
  return (
    <div className="flex flex-col bg-white border rounded-lg">
      <div className="px-4 pt-4 font-semibold text-lg">
        {t('Users with this property')}
      </div>
      <UsersList toUser={toUser} propName={propName} query="" />
    </div>
  );
}

export default observer(UsersWithProp);
