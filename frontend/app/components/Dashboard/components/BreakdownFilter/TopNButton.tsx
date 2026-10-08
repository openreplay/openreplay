import { Button } from '@/ui/actions/button';
import { NumberInput } from '@/ui/inputs/number-input';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

interface Props {
  totalValues?: number;
  /** When provided, drives local state instead of the metric store */
  onApply?: (n: number) => void;
  /** Current number of shown values (for label when onApply is used) */
  value?: number;
}

function TopNButton({ totalValues, onApply, value }: Props) {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const topN = onApply ? (value ?? 0) : metricStore.breakdownTopN;
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(topN || 3);

  React.useEffect(() => {
    if (!onApply) setDraft(topN);
  }, [topN]);

  const apply = (n: number) => {
    if (onApply) {
      onApply(n);
    } else {
      metricStore.setBreakdownTopN(n);
    }
    setOpen(false);
  };

  const isShowingAll = onApply
    ? value == null || value === totalValues
    : topN === 0;
  const label = isShowingAll
    ? t('Showing all values')
    : `${t('Showing top')} ${topN} ${t('values')}`;

  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      className="p-3"
      content={
        <div className="flex flex-col gap-2" style={{ width: 200 }}>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">{t('Show top')}</span>
            <NumberInput
              className="w-[70px]"
              min={1}
              max={totalValues || 999}
              value={draft}
              onChange={(v) => v && setDraft(v)}
            />
            <Button variant="primary" onClick={() => apply(draft)}>
              {t('Apply')}
            </Button>
          </div>
          <Button className="w-full" onClick={() => apply(3)}>
            {t('Show top 3')}
          </Button>
          {totalValues != null && totalValues > 0 && (
            <Button className="w-full" onClick={() => apply(0)}>
              {t('Show all')} ({totalValues}) {t('values')}
            </Button>
          )}
        </div>
      }
    >
      <Button>
        {label} <ChevronDown size={14} />
      </Button>
    </PopoverPanel>
  );
}

export default observer(TopNButton);
