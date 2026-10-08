import { EmptyState } from '@/ui/feedback/EmptyState';
import { PagePanel } from '@/ui/layout/PageCard';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import PeopleTable from '../UsersEvents/components/PeopleTable';

function UsersWithProp({ propName }: { propName: string }) {
  const { t } = useTranslation();
  const { projectsStore, analyticsStore } = useStore();
  const history = useHistory();
  const open = (id: string, e: React.MouseEvent) => {
    const path = withSiteId(
      dataManagement.userPage(id),
      projectsStore.activeSiteId!,
    );
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(path, '_blank');
    else history.push(path);
  };
  return (
    <PagePanel
      head={
        <span className="m-ditem__head-title">
          {t('Users with this property')}
          <span className="m-dmg__count">
            {' · '}
            {analyticsStore.users.total.toLocaleString()}
          </span>
        </span>
      }
    >
      <PeopleTable
        query=""
        propName={propName}
        onOpen={open}
        empty={<EmptyState title={t('Nobody carries this property yet')} />}
      />
    </PagePanel>
  );
}

export default observer(UsersWithProp);
