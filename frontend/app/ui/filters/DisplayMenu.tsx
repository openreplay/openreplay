import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/inputs/select';
import { PopoverPanel } from '@/ui/overlays/popover';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  SlidersHorizontal,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './display-menu.css';

export function MenuSelect<T extends string>({
  id,
  value,
  choices,
  onChange,
}: {
  id?: string;
  value: T;
  choices: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} className="m-dm__select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface DisplayRow {
  id: string;
  label: string;
  control: ReactNode;
}

export interface DisplayShellProps {
  rows: DisplayRow[];

  fields?: { value: string; label: string; on: boolean }[];
  onToggleField?: (value: string) => void;

  changeCount: number;
  onReset: () => void;

  label?: string;
}

export function DisplayShell({
  rows,
  fields,
  onToggleField,
  changeCount,
  onReset,
  label,
}: DisplayShellProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="m-dm">
      <div className="m-dm__section">
        {rows.map((r) => (
          <label key={r.id} className="m-dm__row" htmlFor={r.id}>
            <span className="m-dm__label">{r.label}</span>
            {r.control}
          </label>
        ))}
      </div>

      {fields && fields.length > 0 && (
        <div className="m-dm__section">
          <p className="m-dm__heading">{t('Columns to hide')}</p>
          <div className="m-dm__pills">
            {fields.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`m-dm__pill${f.on ? ' is-on' : ''}`}
                aria-pressed={f.on}
                onClick={() => onToggleField?.(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {changeCount > 0 && (
        <div className="m-dm__foot">
          <Button variant="subtle" onClick={onReset}>
            {t('Reset to default')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      content={content}
    >
      <IconButton
        icon={<SlidersHorizontal size={15} />}
        label={label ?? t('Display')}
        count={changeCount}
        active={changeCount > 0}
        open={open}
      />
    </PopoverPanel>
  );
}

export function SortControl<T extends string>({
  value,
  desc,
  choices,
  onValue,
  onDesc,
  id,
}: {
  value: T;
  desc: boolean;
  choices: readonly { value: T; label: string }[];
  onValue: (v: T) => void;
  onDesc: (d: boolean) => void;
  id: string;
}) {
  const { t } = useTranslation();
  return (
    <span className="m-dm__pair">
      <Button
        size="icon"
        aria-label={desc ? t('Sort ascending') : t('Sort descending')}
        onClick={() => onDesc(!desc)}
      >
        {desc ? (
          <ArrowDownWideNarrow size={13} />
        ) : (
          <ArrowUpNarrowWide size={13} />
        )}
      </Button>
      <MenuSelect<T>
        id={id}
        value={value}
        choices={choices}
        onChange={onValue}
      />
    </span>
  );
}
