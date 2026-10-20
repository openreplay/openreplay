import { IconButton } from '@/ui/actions/IconButton';
import { EditableRow } from '@/ui/inputs/EditableRow';
import { SearchField } from '@/ui/inputs/SearchField';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { toast } from '@/ui/overlays/toast';
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
  // each row keeps where it came from: a custom property may share a name
  // with a built-in field (email, city) and must save back to itself
  type Row = ['flat' | 'properties', string, any];
  const all: Row[] = [
    ...Object.entries(flat).map(([k, v]): Row => ['flat', k, v]),
    ...Object.entries(user.properties).map(
      ([k, v]): Row => ['properties', k, v],
    ),
  ];
  const q = query.trim().toLowerCase();
  const shown = all
    .filter(
      ([, k, v]) =>
        !q ||
        k.toLowerCase().includes(q) ||
        String(v ?? '')
          .toLowerCase()
          .includes(q),
    )
    .sort(([, a], [, b]) =>
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
            shown.map(([source, key, value]) => (
              <EditableRow
                key={`${source}:${key}`}
                label={
                  <span className="m-dmg__mono">{getDisplayNameStr(key)}</span>
                }
                value={value == null ? '' : String(value)}
                placeholder="—"
                onSave={(v) => {
                  if (typeof value !== 'number' || v === '')
                    return onSave(source, key, v);
                  const n = Number(v);
                  if (!Number.isFinite(n))
                    return toast.error(t('{{key}} takes a number', { key }));
                  return onSave(source, key, n);
                }}
              />
            ))
          )}
        </div>
      </div>
    </EntityDrawer>
  );
}

export default observer(UserPropertiesDrawer);
