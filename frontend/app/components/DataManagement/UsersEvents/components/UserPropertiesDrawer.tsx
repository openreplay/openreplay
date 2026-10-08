import { IconButton } from '@/ui/actions/IconButton';
import { EditableRow } from '@/ui/inputs/EditableRow';
import { SearchField } from '@/ui/inputs/SearchField';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { ArrowDownAZ, ArrowDownZA } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type User from 'App/mstore/types/Analytics/User';
import usePropertyNames from 'Components/DataManagement/Properties/usePropertyNames';

export const flatPropertiesOf = (user: User) => ({
  city: user.raw.$city,
  country: user.raw.$country,
  email: user.raw.$email,
  name: user.raw.$name,
  last_name: user.raw.$last_name,
  first_name: user.raw.$first_name,
  avatar: user.raw.$avatar,
});

type Sort = 'off' | 'asc' | 'desc';
const NEXT: Record<Sort, Sort> = { off: 'asc', asc: 'desc', desc: 'off' };

interface Props {
  open: boolean;
  onClose: () => void;
  user: User;
  onSave: (
    path: 'flat' | 'properties',
    key: string,
    value: string | number,
  ) => void;
}

function UserPropertiesDrawer({ open, onClose, user, onSave }: Props) {
  const { t } = useTranslation();
  const { getDisplayNameStr } = usePropertyNames('users');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<Sort>('off');
  const flat = flatPropertiesOf(user);
  const all: [string, any][] = [
    ...Object.entries(flat),
    ...Object.entries(user.properties),
  ];
  const q = query.trim().toLowerCase();
  const shown = all
    .filter(
      ([k, v]) =>
        !q ||
        k.toLowerCase().includes(q) ||
        String(v ?? '')
          .toLowerCase()
          .includes(q),
    )
    .sort(([a], [b]) =>
      sort === 'asc'
        ? a.localeCompare(b)
        : sort === 'desc'
          ? b.localeCompare(a)
          : 0,
    );

  return (
    <EntityDrawer
      size="wide"
      open={open}
      onClose={onClose}
      eyebrow={t('User')}
      title={t('All user properties')}
      meta={<span>{t('{{n}} properties', { n: all.length })}</span>}
    >
      <div className="m-uprops">
        <div className="m-uprops__tools">
          <SearchField
            placeholder={t('Search properties')}
            value={query}
            onChange={setQuery}
          />
          <IconButton
            icon={
              sort === 'desc' ? (
                <ArrowDownZA size={14} />
              ) : (
                <ArrowDownAZ size={14} />
              )
            }
            label={
              sort === 'off'
                ? t('Sort A to Z')
                : sort === 'asc'
                  ? t('Sort Z to A')
                  : t('Original order')
            }
            pressed={sort !== 'off'}
            onClick={() => setSort(NEXT[sort])}
          />
        </div>
        <div className="m-uprops__list">
          {shown.length === 0 ? (
            <p className="m-evd__none">{t('No property matches that.')}</p>
          ) : (
            shown.map(([key, value]) => (
              <EditableRow
                key={key}
                label={
                  <span className="m-dmg__mono">{getDisplayNameStr(key)}</span>
                }
                value={value == null ? '' : String(value)}
                placeholder="—"
                onSave={(v) =>
                  onSave(
                    key in flat ? 'flat' : 'properties',
                    key,
                    typeof value === 'number' && v !== '' ? parseFloat(v) : v,
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </EntityDrawer>
  );
}

export default observer(UserPropertiesDrawer);
