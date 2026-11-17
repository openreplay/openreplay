import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/inputs/select';
import { useViewport } from '@/ui/layout/use-viewport';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type FilterStripProps,
  StripChoices,
  stripActive,
} from './FilterStrip';
import { SheetSection, useInFilterSheet, useSheetCount } from './PhoneFilters';
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

export interface MoreField {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

function MoreFields({
  choices,
  isOn,
  onToggle,
}: {
  choices: MoreField[];
  isOn: (value: string) => boolean;
  onToggle: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = choices.filter(
    (c) =>
      !q ||
      c.label.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q) ||
      c.hint?.toLowerCase().includes(q),
  );
  const groups = [...new Set(shown.map((c) => c.group ?? ''))];
  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      className="m-dm__more"
      content={
        <div>
          <PopoverSearch
            placeholder={t('Search columns')}
            value={query}
            onChange={setQuery}
          />
          <div className="m-dm__more-list">
            {groups.map((g) => (
              <div key={g} role="group" aria-label={g || undefined}>
                {g && <p className="m-dm__more-group">{g}</p>}
                {shown
                  .filter((c) => (c.group ?? '') === g)
                  .map((c) => (
                    <CheckRow
                      key={c.value}
                      on={isOn(c.value)}
                      onToggle={() => onToggle(c.value)}
                      meta={c.hint}
                    >
                      {c.label}
                    </CheckRow>
                  ))}
              </div>
            ))}
            {shown.length === 0 && (
              <p className="m-dm__more-none">
                {t('No column matches “{{q}}”', { q: query.trim() })}
              </p>
            )}
          </div>
        </div>
      }
    >
      <button type="button" className="m-dm__pill m-dm__pill--add">
        <Plus size={12} aria-hidden="true" />
        {t('Add column')}
      </button>
    </PopoverPanel>
  );
}

export interface DisplayShellProps {
  rows: DisplayRow[];

  fields?: { value: string; label: string; on: boolean }[];
  onToggleField?: (value: string) => void;
  fieldsHeading?: string;
  /** columns beyond the pills, behind a searchable "Add column" */
  moreFields?: MoreField[];

  changeCount: number;
  onReset: () => void;

  label?: string;
  /** the page's strip, drawn as "Show" here at phone (it folds into this) */
  strip?: FilterStripProps;
}

export function DisplayShell({
  rows,
  fields,
  onToggleField,
  fieldsHeading,
  moreFields,
  changeCount: pageChanges,
  onReset,
  label,
  strip,
}: DisplayShellProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const inSheet = useInFilterSheet();
  const phone = useViewport() === 'phone';
  const folded = phone && strip != null && !inSheet;
  // a phone list shows no columns, so there are none to hide
  const hideable =
    !phone &&
    ((fields != null && fields.length > 0) ||
      (moreFields != null && moreFields.length > 0));
  const stripOn = strip != null && stripActive(strip);
  const changeCount = pageChanges + (folded && stripOn ? 1 : 0);

  const sections = (
    <>
      {folded && (
        <div className="m-dm__section">
          <p className="m-dm__heading">{t('Show')}</p>
          <StripChoices {...strip} />
        </div>
      )}
      {rows.length > 0 && (
        <div className="m-dm__section">
          {rows.map((r) => (
            <label key={r.id} className="m-dm__row" htmlFor={r.id}>
              <span className="m-dm__label">{r.label}</span>
              {r.control}
            </label>
          ))}
        </div>
      )}

      {hideable && (
        <div className="m-dm__section">
          <p className="m-dm__heading">
            {fieldsHeading ?? t('Visible columns')}
          </p>
          <div className="m-dm__pills">
            {fields?.map((f) => (
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
            {moreFields && moreFields.length > 0 && (
              <MoreFields
                choices={moreFields}
                isOn={(v) => !!fields?.some((f) => f.value === v && f.on)}
                onToggle={(v) => onToggleField?.(v)}
              />
            )}
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
    </>
  );

  useSheetCount(inSheet ? pageChanges + (stripOn ? 1 : 0) : 0);
  if (inSheet)
    return (
      <>
        {strip && (
          <SheetSection title={t('Show')} first>
            <StripChoices {...strip} />
          </SheetSection>
        )}
        {(rows.length > 0 || pageChanges > 0) && (
          <SheetSection title={label ?? t('Display')}>
            <div className="m-dm is-sheet">{sections}</div>
          </SheetSection>
        )}
      </>
    );
  if (phone && !folded && rows.length === 0 && changeCount === 0) return null;

  const content = <div className="m-dm">{sections}</div>;

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
