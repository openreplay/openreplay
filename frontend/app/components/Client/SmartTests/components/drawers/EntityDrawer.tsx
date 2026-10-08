import { Chip } from '@/ui/data/Chip';
import { Input } from '@/ui/inputs/input';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTestCounts } from '../../queries';
import './test-drawer.css';

export {
  EntityDrawer,
  Section,
  DrawerFooter,
} from '@/ui/overlays/EntityDrawer';

/** Stacked label + control. A div, not a label: a label would forward clicks into
 *  the first control of a multi-select. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="m-dfield">
      <span className="m-dfield__label">{label}</span>
      {children}
    </div>
  );
}

const MAX_TAGS = 3;

/** Up to 3 tags per test, offering the ones the project already uses. */
export function TagEditor({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const { data: tagCounts } = useTestCounts('tags', {});
  const known = (tagCounts?.buckets ?? []).map((b) => b.value).filter(Boolean);

  const add = (tag: string) => {
    const v = tag.trim();
    if (!v || value.includes(v) || value.length >= MAX_TAGS) return;
    onChange([...value, v]);
    setText('');
    setAdding(false);
  };
  const stop = () => {
    setAdding(false);
    setText('');
  };
  const suggestions = known.filter(
    (k) => !value.includes(k) && k.toLowerCase().includes(text.toLowerCase()),
  );

  return (
    <div className="m-tags">
      {value.map((tag) => (
        <Chip
          key={tag}
          kind="tag"
          removeLabel={t('Remove {{tag}}', { tag })}
          onRemove={() => onChange(value.filter((x) => x !== tag))}
        >
          {tag}
        </Chip>
      ))}
      {value.length < MAX_TAGS &&
        (adding ? (
          <Input
            autoFocus
            value={text}
            placeholder={t('Tag')}
            className="m-tags__input"
            maxLength={24}
            aria-label={t('New tag')}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text.trim()) add(text);
              else stop();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add(text);
              if (e.key === 'Escape') {
                e.stopPropagation();
                stop();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="m-tags__add"
            onClick={() => setAdding(true)}
          >
            <Plus size={12} aria-hidden="true" /> {t('Tag')}
          </button>
        ))}
      {adding && suggestions.length > 0 && (
        <span className="m-tags__sugg">
          {suggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
            >
              {s}
            </button>
          ))}
        </span>
      )}
      {value.length >= MAX_TAGS && (
        <Tooltip title={t('Three is the cap.')}>
          <span className="m-tags__full">{t('3 of 3')}</span>
        </Tooltip>
      )}
    </div>
  );
}
