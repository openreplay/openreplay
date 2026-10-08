import { Button } from '@/ui/actions/button';
import { Pencil } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './editable-row.css';
import { Input } from './input';
import { Textarea } from './textarea';

export interface EditableRowProps {
  label: ReactNode;
  value: string;

  onSave?: (value: string) => void;

  multiline?: boolean;
  placeholder?: string;

  display?: ReactNode;

  hint?: ReactNode;
}

export function EditableRow({
  label,
  value,
  onSave,
  multiline,
  placeholder,
  display,
  hint,
}: EditableRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  // seeded on entering edit only: a refetch mid-edit must not wipe the typing
  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next !== value && onSave) onSave(next);
    setEditing(false);
  };
  const cancel = () => setEditing(false);
  const name = typeof label === 'string' ? label.toLowerCase() : 'value';

  return (
    <div
      className={`m-erow${editing ? ' is-editing' : ''}${onSave ? ' is-editable' : ''}`}
    >
      <div className="m-erow__label">
        <span>{label}</span>
        {hint && <span className="m-erow__hint">{hint}</span>}
      </div>
      {editing ? (
        <div className="m-erow__editor">
          {multiline ? (
            <Textarea
              ref={ref}
              value={draft}
              rows={2}
              aria-label={name}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
              }}
            />
          ) : (
            <Input
              ref={ref}
              value={draft}
              aria-label={name}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
            />
          )}
          <div className="m-erow__buttons">
            <Button onClick={cancel}>{t('Cancel')}</Button>
            <Button variant="primary" onClick={commit}>
              {t('Save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="m-erow__value">
          <span className={`m-erow__text${value ? '' : ' is-empty'}`}>
            {display ?? (value || placeholder || '—')}
          </span>
          {onSave && (
            <button
              type="button"
              className="m-erow__pencil"
              aria-label={t('Edit {{name}}', { name })}
              onClick={startEditing}
            >
              <Pencil size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
