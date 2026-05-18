import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { CopyButton, confirm } from 'UI';

function ApiKeySettings() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const [revealed, setRevealed] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);

  const isAdmin = userStore.isAdmin;
  const { apiKey } = userStore.account;
  const maskedKey = apiKey ? '•'.repeat(apiKey.length) : '';

  const onRegenerate = async () => {
    if (!isAdmin) return;
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, proceed',
        confirmation: 'Are you sure you want to regenerate your API key?',
      })
    ) {
      setRegenerating(true);
      try {
        await userStore.regenerateKey();
      } finally {
        setRegenerating(false);
      }
    }
  };

  return (
    <div className="px-4 py-2 md:p-0 flex items-center gap-2">
      <div
        className="w-72 h-9 px-2 flex items-center justify-between border border-gray-light hover:border-main! rounded-sm bg-white cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => setRevealed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setRevealed((v) => !v);
        }}
      >
        <div className="truncate font-mono text-sm">
          {revealed ? apiKey : maskedKey}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton size="small" isIcon content={apiKey} />
        </div>
      </div>
      <div>
        <Button
          disabled={!isAdmin}
          onClick={onRegenerate}
          loading={regenerating}
        >
          {t('Regenerate')}
        </Button>
      </div>
    </div>
  );
}

export default observer(ApiKeySettings);
