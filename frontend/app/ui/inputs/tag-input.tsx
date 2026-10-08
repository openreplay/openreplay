import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

export interface TagInputProps {
  id?: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;

  accept?: (text: string) => boolean;
}

export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  accept,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim().replace(/,$/, '');
    if (!text || (accept && !accept(text)) || value.includes(text)) return;
    onChange([...value, text]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      data-slot="tag-input"
      className={cn(
        'm-hover flex min-h-[var(--m-control-height-sm)] w-full flex-wrap items-center gap-2 rounded-control border border-border-default bg-surface-default px-3 py-1',
        'hover:border-border-strong focus-within:border-border-strong',
        className,
      )}
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex h-[1.25rem] items-center gap-1 rounded-chip bg-surface-sunken pl-3 pr-1 text-xs text-content-primary"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            className="m-hover inline-flex size-[1rem] items-center justify-center rounded-chip text-content-decorative hover:text-content-primary"
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            <X size={10} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-label={ariaLabel}
        className="min-w-[8rem] flex-1 bg-transparent text-sm text-content-primary outline-none placeholder:text-content-placeholder"
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
      />
    </div>
  );
}
