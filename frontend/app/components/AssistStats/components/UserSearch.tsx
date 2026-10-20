import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

/** Narrow the reports to one team member, found by name or email. */
function UserSearch({ onUserSelect }: { onUserSelect: (id: any) => void }) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  React.useEffect(() => {
    if (userStore.list.length === 0) void userStore.fetchUsers();
  }, []);

  const q = query.trim().toLowerCase();
  const shown = userStore.list.filter(
    (u: any) =>
      !q ||
      String(u.name ?? '')
        .toLowerCase()
        .includes(q) ||
      String(u.email ?? '')
        .toLowerCase()
        .includes(q),
  );
  const current = userStore.list.find((u: any) => String(u.userId) === value);
  const pick = (v: string | undefined) => {
    setValue(v);
    onUserSelect(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      content={
        <div className="w-64" role="menu" onKeyDown={menuKeyDown}>
          <PopoverSearch
            placeholder={t('Search team members')}
            value={query}
            onChange={setQuery}
          />
          <div className="max-h-72 overflow-y-auto p-1">
            {!q && (
              <CheckRow
                single
                on={value == null}
                onToggle={() => pick(undefined)}
              >
                {t('All team members')}
              </CheckRow>
            )}
            {shown.map((u: any) => (
              <CheckRow
                key={u.userId}
                single
                on={String(u.userId) === value}
                onToggle={() => pick(String(u.userId))}
              >
                {u.name || u.email}
              </CheckRow>
            ))}
            {q && shown.length === 0 && (
              <p className="px-3 py-2 text-xs text-content-muted">
                {t('Nothing matches that.')}
              </p>
            )}
          </div>
        </div>
      }
    >
      <Button className="w-52 justify-between" aria-label={t('Team member')}>
        <span className="m-truncate">
          {current?.name || current?.email || t('All team members')}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </Button>
    </PopoverPanel>
  );
}

export default observer(UserSearch);
