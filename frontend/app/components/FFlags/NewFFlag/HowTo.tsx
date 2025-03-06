import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageTitle, CodeBlock } from 'UI';

function HowTo() {
  const { t } = useTranslation();
  const code = `
// can be imported from @openreplay/tracker
interface IFeatureFlag {
  key: string
  is_persist: boolean
  value: string | boolean
  payload: string
}

tracker.onFlagsLoad((flags: IFeatureFlag[]) => {
 /* run code */
})
            
// or
            
if (openreplay.isFlagEnabled('my_flag')) {
  // run your activation code here
}

// or 
// returns FeatureFlag if exists
tracker.getFeatureFlag('my_flag') 

// reload flags from server 
// (in case if any user data changed during the session)
tracker.reloadFlags() 
`;
  return (
    <div className="w-full h-screen p-4">
      <PageTitle title={t('Implement feature flags')} />

      <div className="my-2">
        <CodeBlock code={code} language="typescript" />
      </div>
      <a
        className="link"
        href="https://docs.openreplay.com/en/installation/feature-flags"
      >
        {t('Documentation')}
      </a>
    </div>
  );
}

export default HowTo;
