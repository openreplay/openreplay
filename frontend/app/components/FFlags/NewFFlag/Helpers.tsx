import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionMarkHint } from 'UI';

function Rollout() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      {t('Rollout %')}{' '}
      <QuestionMarkHint
        delay={150}
        content={t('Must add up to 100% across all variants')}
      />
    </div>
  );
}

function Payload() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 font-semibold">
      {t('Payload')}{' '}
      <QuestionMarkHint
        delay={150}
        content="Will be sent as an additional string"
      />{' '}
      <span className="text-disabled-text text-sm font-normal">
        ({t('Optional')})
      </span>
    </div>
  );
}

export { Payload, Rollout };
