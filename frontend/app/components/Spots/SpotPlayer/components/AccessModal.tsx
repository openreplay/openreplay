import { IconButton } from '@/ui/actions/IconButton';
import { InlineSelect } from '@/ui/inputs/select';
import { Switch } from '@/ui/inputs/switch';
import copy from 'copy-to-clipboard';
import { Check, Copy } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { DAY_SECS, HOUR_SECS, WEEK_SECS } from 'App/utils/index';

const EXPIRY = {
  hour: HOUR_SECS,
  threeHours: 3 * HOUR_SECS,
  day: DAY_SECS,
  week: WEEK_SECS,
} as const;
type Expiry = keyof typeof EXPIRY;

function AccessModal() {
  const { t } = useTranslation();
  const { spotStore } = useStore();
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState<Expiry>('hour');
  const [busy, setBusy] = useState(false);
  const isPublic = !!spotStore.pubKey;

  const spotId = spotStore.currentSpot!.spotId!;
  const link = `${window.location.origin}/view-spot/${spotId}${
    spotStore.pubKey ? `?pub_key=${spotStore.pubKey.value}` : ''
  }`;

  const setPublic = async (on: boolean) => {
    setBusy(true);
    try {
      await spotStore.generateKey(spotId, on ? EXPIRY[expiry] : 0);
    } finally {
      setBusy(false);
    }
  };
  const changeExpiry = async (v: Expiry) => {
    setExpiry(v);
    await spotStore.generateKey(spotId, EXPIRY[v]);
  };
  const onCopy = () => {
    copy(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="m-rs__access">
      <label className="m-rs__access-row">
        <span>{t('Anyone with the link can view')}</span>
        <Switch
          checked={isPublic}
          disabled={busy}
          onCheckedChange={(on) => void setPublic(on)}
        />
      </label>
      <div className="m-rs__access-link">
        <span className="m-mono m-truncate">{link}</span>
        <IconButton
          icon={copied ? <Check size={12} /> : <Copy size={12} />}
          label={isPublic ? t('Copy public link') : t('Copy link')}
          variant="ghost"
          onClick={onCopy}
        />
      </div>
      {isPublic ? (
        <label className="m-rs__access-row">
          <span>{t('Link expires in')}</span>
          <InlineSelect
            ariaLabel={t('Link expires in')}
            value={expiry}
            onChange={(v) => void changeExpiry(v)}
            options={[
              { value: 'hour', label: t('1 hour') },
              { value: 'threeHours', label: t('3 hours') },
              { value: 'day', label: t('1 day') },
              { value: 'week', label: t('1 week') },
            ]}
          />
        </label>
      ) : (
        <p className="m-rs__access-hint">
          {t('Only members of this workspace can open the spot.')}
        </p>
      )}
    </div>
  );
}

export default observer(AccessModal);
