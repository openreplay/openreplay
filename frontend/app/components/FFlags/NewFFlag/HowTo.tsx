import React from 'react';
// @ts-ignore
import Highlight from 'react-highlight';
import { PageTitle } from 'UI';

function HowTo() {
  return (
    <div className={'w-full h-screen p-4'}>
      <PageTitle title={'Implement feature flags'} />

      <div className={'my-2'}>
        <Highlight className={'js'}>
          {`
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
`}
        </Highlight>
      </div>
      <a className={'link'} href={"https://docs.openreplay.com/en/installation/feature-flags"}>Documentation</a>
    </div>
  );
}

export default HowTo;
