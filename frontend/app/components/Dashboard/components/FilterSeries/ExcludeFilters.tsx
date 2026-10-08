import { useStore } from '@/mstore';
import { Button } from '@/ui/actions/button';
import { EyeOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Filter from 'App/mstore/types/filter';
import { FilterKey } from 'App/types/filter/filterType';

import {
  SingleRule,
  buildFilterEditor,
  useCatalogue,
} from 'Shared/FilterEditor';

interface Props {
  metric: any;
}
function ExcludeFilters(props: Props) {
  const { filterStore } = useStore();
  const { t } = useTranslation();
  const { metric } = props;

  const addPageFilter = () => {
    const f = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });
    if (!f) {
      console.error('Failed to find location filter');
      return;
    }
    metric.updateExcludes([f]);
  };

  const all = useCatalogue();
  const editor = buildFilterEditor({
    filters: metric.excludes,
    eventsOrder: 'or',
    add: () => {},
    update: (i, f) => metric.updateExcludeByIndex(i, f),
    remove: (i) => metric.removeExcludeByIndex(i),
    move: () => {},
    setEventsOrder: () => {},
    clear: () => metric.updateExcludes([]),
  });
  const rules = [...editor.events, ...editor.properties];
  const eventEntries = all.filter((e) => e.isEvent);

  return (
    <div className="m-jrny__excludes">
      {rules.length > 0 ? (
        rules.map((rule) => (
          <div className="m-jrny__row" key={rule.key}>
            <span className="m-jrny__word">{t('Leaving out')}</span>
            <SingleRule
              filter={rule}
              editor={editor}
              entries={eventEntries}
              removable
            />
          </div>
        ))
      ) : (
        <div className="m-jrny__row">
          <Button variant="subtle" size="sm" onClick={addPageFilter}>
            <EyeOff size={13} aria-hidden="true" />
            {t('Leave pages out')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default observer(ExcludeFilters);
