import React from 'react';
import { KEY, options } from 'App/dev/console';
import { Switch } from 'UI';
import { useTranslation } from 'react-i18next';

function getDefaults() {
  const storedString = localStorage.getItem(KEY);
  if (storedString) {
    const storedOptions = JSON.parse(storedString);
    return storedOptions.verbose;
  }
  return false;
}

function DebugLog() {
  const { t } = useTranslation();
  const [showLogs, setShowLogs] = React.useState(getDefaults);

  const onChange = (checked: boolean) => {
    setShowLogs(checked);
    options.logStuff(checked);
  };
  return (
    <div>
      <h3 className="text-lg">{t('Player Debug Logs')}</h3>
      <div className="my-1">
        {t('Show debug information in browser console.')}
      </div>
      <div className="mt-2">
        <Switch checked={showLogs} onChange={onChange} />
      </div>
    </div>
  );
}

export default DebugLog;
