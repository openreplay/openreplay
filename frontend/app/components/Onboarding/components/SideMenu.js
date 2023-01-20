import React from 'react'
import stl from './sideMenu.module.css'
import cn from 'classnames'
import { SideMenuitem } from 'UI'
import OnboardingMenu from './OnboardingMenu/OnboardingMenu'

export default function SideMenu() {
  return (
    <div className={stl.wrapper}>
      <div className={ cn(stl.header, 'flex items-center') }>
        <div className={ stl.label }>
          <span>Setup Project</span>
        </div>
      </div>

      <OnboardingMenu />

      <div className={cn(stl.divider, 'my-4')} />

      <div className={ cn(stl.header, 'flex items-center') }>
        <div className={ stl.label }>
          <span>Help</span>
        </div>
      </div>

      <SideMenuitem
        title="Documentation"
        iconName="journal-code"
        onClick={() => window.open('https://docs.openreplay.com', '_blank')}
      />

      <SideMenuitem
        title="Report Issue"
        iconName="github"
        onClick={() => window.open('https://github.com/openreplay/openreplay/issues', '_blank')}
      />
    </div>
  )
}
