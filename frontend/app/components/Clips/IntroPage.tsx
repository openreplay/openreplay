import React from 'react'
import { Button } from 'antd'
import { Icon } from 'UI'
import { PlayCircleFilled } from '@ant-design/icons'

function IntroPage() {
  return (
    <div className={'widget-wrapper h-full flex flex-col gap-4 items-center justify-center'}>
      <Icon name={'flashlight'} size={42} />
      <div className={'font-semibold text-xl'}>Introducing OpenReplay Clips!</div>
      <div className={'text-disabled-text text-center w-[410px]'}>
        Clips are bite-sized, insightful segments of your sessions, saving you time by highlighting critical issues and user behaviors.
      </div>
      <Button type={'primary'} className={'w-1/5'}>
        <div>Play Clips</div>
        <PlayCircleFilled />
        </Button>
      <Button type={'link'}>Learn More</Button>
    </div>
  )
}

export default IntroPage