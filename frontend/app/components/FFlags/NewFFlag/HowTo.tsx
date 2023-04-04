import React from 'react'
// @ts-ignore
import Highlight from 'react-highlight'
import { PageTitle } from 'UI'

function HowTo() {
  return (
    <div className={'w-full h-screen p-4'}>
      <PageTitle title={'Implement feature flags'} />

      <div className={'my-2'}>
        <Highlight className={'js'}>
          {
            `if (openreplay.isFeatureEnabled('my_flag')) {
  // run your activation code here
}`}
        </Highlight>
      </div>
      <a className={'link'}>Documentation</a>
    </div>
  )
}

export default HowTo;