import { Switch } from '@/ui/inputs/switch';
import { QuestionMarkHint } from '@/ui/overlays/QuestionMarkHint';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const inactivitySettingKey = '__openreplay_skip_dom_inactivity';
function getDefault() {
  return localStorage.getItem(inactivitySettingKey) === 'true';
}
function InactivitySettings() {
  const [skipDom, setSkipDom] = React.useState(getDefault);
  const { t } = useTranslation();

  const onChange = (checked: boolean) => {
    setSkipDom(checked);
    localStorage.setItem(inactivitySettingKey, checked ? 'true' : 'false');
  };
  return (
    <div>
      <h3 className="text-lg">{t('Skip Inactivity')}</h3>
      <div className="my-1 flex items-center gap-2">
        <span>
          {t('Ignore DOM changes when determining inactivity periods.')}
        </span>
        <QuestionMarkHint
          content={
            "Useful when you have visual animations in your app even when your users aren't active."
          }
        />
      </div>
      <div className="mt-2">
        <Switch onCheckedChange={onChange} checked={skipDom} />
      </div>
    </div>
  );
}

export default InactivitySettings;
