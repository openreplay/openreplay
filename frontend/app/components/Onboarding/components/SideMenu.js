import React from 'react'
import stl from './sideMenu.css'
import cn from 'classnames'
import { SideMenuitem, Icon } from 'UI'
import OnboardingMenu from './OnboardingMenu/OnboardingMenu'

export default function SideMenu() {
  return (
    <div className={stl.wrapper}>
      <div className={ cn(stl.header, 'flex items-center') }>
        <div className={ stl.label }>
          <span>Configure Your Project</span>
        </div>
      </div>

      <OnboardingMenu />
    </div>
  )
}
