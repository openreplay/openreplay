import { SimpleSelect } from '@/ui/inputs/select';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

/** Narrow the reports to one team member. */
function UserSearch({ onUserSelect }: { onUserSelect: (id: any) => void }) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const [value, setValue] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (userStore.list.length === 0) void userStore.fetchUsers();
  }, []);

  return (
    <SimpleSelect
      clearable
      className="w-52"
      value={value}
      placeholder={t('All team members')}
      ariaLabel={t('Team member')}
      onChange={(v) => {
        setValue(v);
        onUserSelect(v);
      }}
      options={userStore.list.map((u: any) => ({
        value: String(u.userId),
        label: u.name,
      }))}
    />
  );
}

export default observer(UserSearch);
