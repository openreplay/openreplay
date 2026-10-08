import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { ListFooter } from '@/ui/layout/ListFooter';
import { ChevronRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useLocation } from 'App/routing';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';
import UserSessionsDrawer from 'Shared/UserSessionsDrawer';

interface User {
  name: string;
  sessions: number;
}

/** Returning users under a retention card; a row opens that user's sessions. */
function CardUserList() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const history = useHistory();
  const location = useLocation();
  const userId = new URLSearchParams(location.search).get('userId');

  const [data] = useState<User[]>([
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
  ]);

  const openUser = (user: User) =>
    history.replace({
      search: new URLSearchParams({ userId: user.name }).toString(),
    });
  const closeUser = () => history.replace({ search: '' });

  const columns: Column<User>[] = [
    {
      title: t('User'),
      key: 'name',
      render: (u) => (
        <span className="flex items-center gap-3 text-sm text-content-primary">
          <SessionAvatar seed={u.name.length} />
          {u.name}
        </span>
      ),
    },
    {
      title: t('Sessions'),
      key: 'sessions',
      width: 120,
      align: 'right',
      render: (u) => (
        <span className="inline-flex items-center gap-2 tabular-nums text-content-secondary">
          {u.sessions}
          <ChevronRight size={14} className="text-content-muted" />
        </span>
      ),
    },
  ];

  return (
    <section className="m-panel">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-base font-medium text-content-primary">
          {t('Returning users')}
        </h2>
        <Button variant="subtle" size="sm">
          {t('All sessions')}
        </Button>
      </div>
      <DataTable<User>
        ariaLabel={t('Returning users')}
        columns={columns}
        rows={data}
        rowKey={(_, i) => String(i)}
        onRowClick={openUser}
      />
      <ListFooter
        page={metricStore.sessionsPage}
        pageSize={metricStore.sessionsPageSize}
        total={data.length}
        noun={[t('user'), t('users')]}
        onPage={(page) => metricStore.updateKey('sessionsPage', page)}
      />
      <UserSessionsDrawer
        open={!!userId}
        onClose={closeUser}
        userId={userId ?? ''}
        name={userId ?? ''}
      />
    </section>
  );
}

export default observer(CardUserList);
