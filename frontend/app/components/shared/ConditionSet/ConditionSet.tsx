import { IconButton } from '@/ui/actions/IconButton';
import { Input } from '@/ui/inputs/input';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  FilterBar,
  buildFilterEditor,
  seriesTarget,
  useCatalogue,
} from 'Shared/FilterEditor';

import './condition-set.css';

interface Props {
  set: number;
  removeCondition: (ind: number) => void;
  index: number;
  readonly?: boolean;
  conditions: any;
  bottomLine1: string;
  bottomLine2: string;
  onChanged: () => void;
  onPercentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  changeName: (name: string) => void;
  isMobile?: boolean;
}

/** One recording condition: a rule set on the shared filter bar plus its capture rate. */
function ConditionSetComponent({
  removeCondition,
  index,
  set,
  readonly,
  bottomLine1,
  bottomLine2,
  onPercentChange,
  conditions,
  onChanged,
  changeName,
}: Props) {
  const { t } = useTranslation();
  const all = useCatalogue();
  const entries = React.useMemo(
    () => all.filter((e) => (e.source as any)?.isConditional),
    [all],
  );
  const editor = buildFilterEditor(seriesTarget(conditions.filter, onChanged));
  const [name, setName] = React.useState(conditions.name ?? '');
  React.useEffect(() => setName(conditions.name ?? ''), [conditions.name]);

  return (
    <section className="m-condset">
      <header className="m-condset__head">
        {readonly ? (
          <span className="m-condset__name">
            {conditions.name || `${t('Condition set')} ${set}`}
          </span>
        ) : (
          <Input
            variant="bare"
            className="m-condset__name px-0"
            value={name}
            maxLength={20}
            placeholder={`${t('Condition set')} ${set}`}
            aria-label={t('Condition set name')}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && changeName(name.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        )}
        {readonly ? null : (
          <IconButton
            icon={<Trash2 size={14} />}
            label={t('Remove condition set')}
            variant="ghost"
            onClick={() => removeCondition(index)}
          />
        )}
      </header>
      {readonly && !conditions.filter?.filters?.length ? (
        <p className="m-condset__none">{t('No conditions')}</p>
      ) : (
        <div className="m-condset__rules">
          <FilterBar
            variant="panel"
            editor={editor}
            entries={entries}
            lead={t('Say which sessions this set records')}
          />
        </div>
      )}
      <footer className="m-condset__foot">
        <span>{bottomLine1}</span>
        {readonly ? (
          <strong>{conditions.rolloutPercentage}%</strong>
        ) : (
          <span className="m-condset__rate">
            <Input
              className="tabular-nums"
              inputMode="numeric"
              value={conditions.rolloutPercentage}
              aria-label={t('Capture rate')}
              suffix="%"
              onChange={onPercentChange}
            />
          </span>
        )}
        <span>{bottomLine2}</span>
      </footer>
    </section>
  );
}

export default observer(ConditionSetComponent);
