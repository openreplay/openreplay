import React from 'react'
import OnboardingTabs from '../OnboardingTabs'
import ProjectFormButton from '../ProjectFormButton'
import { Button, Icon } from 'UI'

export default function InstallOpenReplayTab() {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b text-2xl">
        <span>👋</span>
        <div className="ml-3 flex items-end">
          <span>Hey there! Setup</span>
          <ProjectFormButton />
        </div>
      </h1>
      <div className="p-4">
        <div className="mb-6 text-lg font-medium">Setup OpenReplay through NPM package <span className="text-sm">(recommended)</span> or script.</div>
        <OnboardingTabs />
      </div>
      <div className="border-t px-4 py-3 flex justify-end">
        <Button variant="primary" className="">
          Identify Users
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  )
}
