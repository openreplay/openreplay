import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { FilterStrip, type StripItem } from '@/ui/filters/FilterStrip';
import { Input } from '@/ui/inputs/input';
import { Switch } from '@/ui/inputs/switch';
import { MoreHorizontal, Search, X } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';

/** A panel's sub-tabs, with counts when the caller has them. */
export function PanelTabs({
  items,
  active,
  onSelect,
  label,
}: {
  items: readonly StripItem[];
  active: string;
  onSelect: (key: string) => void;
  label: string;
}) {
  return (
    <FilterStrip
      label={label}
      items={items}
      selected={[active]}
      onSelect={onSelect}
    />
  );
}

export function Keyword({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const label = placeholder ?? t('Filter by keyword');
  return (
    <div className="m-dt__keyword relative">
      <Search
        size={12}
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-content-decorative"
      />
      <Input
        className="pl-6 pr-6"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          aria-label={t('Clear')}
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center px-1 text-content-decorative hover:text-content-primary"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export interface PanelToggle {
  key: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

/** Set-once options behind one ellipsis, as switch rows. */
export function PanelMenu({
  toggles,
}: {
  toggles: readonly (PanelToggle | false | null | undefined)[];
}) {
  const { t } = useTranslation();
  const rows = toggles.filter((r): r is PanelToggle => !!r);
  if (rows.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className="inline-flex">
          <IconButton
            icon={<MoreHorizontal size={14} />}
            label={t('View options')}
            variant="ghost"
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {rows.map((r) => (
          <DropdownMenuItem
            key={r.key}
            role="menuitemcheckbox"
            aria-checked={r.checked}
            className="m-dt__menu-switch"
            onSelect={(e) => {
              e.preventDefault();
              r.onChange(!r.checked);
            }}
          >
            <span>{r.label}</span>
            <Switch checked={r.checked} tabIndex={-1} aria-hidden="true" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** True when the session recorded more than one browser tab. */
export function useMultiTab(): boolean {
  const { store } = React.useContext(PlayerContext);
  return Object.keys(store?.get().tabStates ?? {}).length > 1;
}

export function NoData({
  title,
  hint,
}: {
  title?: ReactNode;
  hint?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="m-dt__nodata">
      <p className="m-dt__nodata-title">{title ?? t('No data')}</p>
      {hint && <p className="m-dt__nodata-hint">{hint}</p>}
    </div>
  );
}

/** Left and right halves of a panel bar. */
export function BarSide({
  side,
  children,
}: {
  side: 'left' | 'right';
  children: ReactNode;
}) {
  return <div className={`m-dt__bar-${side}`}>{children}</div>;
}
