import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { Pencil } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './editable-title.css';

/** Rename in place, shared by drawers and page headers: Enter saves, Escape
    cancels, an empty commit keeps the old name. With `autoEdit` (creating) the
    name is live and the caller's footer commits it. */
export function EditableTitle({
  title,
  onChange,
  autoEdit,
  placeholder,
  heading,
}: {
  title: string;
  onChange: (title: string) => void;
  autoEdit?: boolean;
  placeholder?: string;
  heading: (title: string) => ReactNode;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!!autoEdit);
  const [val, setVal] = useState(autoEdit ? '' : title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setVal(title);
  }, [title, editing]);

  // a drawer takes focus on open; the field asks a beat later
  useEffect(() => {
    if (!editing) return undefined;
    const id = window.setTimeout(() => ref.current?.focus(), autoEdit ? 80 : 0);
    return () => window.clearTimeout(id);
  }, [editing, autoEdit]);

  const commit = () => {
    const v = val.trim();
    if (v && v !== title) onChange(v);
    else setVal(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="m-etitle__rename">
        <Input
          ref={ref}
          value={val}
          maxLength={120}
          aria-label={t('Name')}
          placeholder={autoEdit ? (placeholder ?? t('Name')) : undefined}
          onChange={(e) => {
            setVal(e.target.value);
            if (autoEdit) onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              e.stopPropagation();
              setVal(title);
              setEditing(false);
            }
          }}
        />
        {!autoEdit && (
          <>
            <Button
              variant="subtle"
              onClick={() => {
                setVal(title);
                setEditing(false);
              }}
            >
              {t('Cancel')}
            </Button>
            <Button variant="primary" onClick={commit}>
              {t('Save')}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="m-etitle__btn"
      onClick={() => setEditing(true)}
      aria-label={t('Rename {{title}}', { title })}
    >
      {heading(title)}
      <Pencil size={13} aria-hidden="true" />
    </button>
  );
}
