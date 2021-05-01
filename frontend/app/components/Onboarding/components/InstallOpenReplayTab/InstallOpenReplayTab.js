import React from 'react'
import OnboardingTabs from '../OnboardingTabs'
import ProjectFormButton from '../ProjectFormButton'

export default function InstallOpenReplayTab() {
  return (
    <div className="pt-8">
      <h1 className="flex items-center mb-4">
        <span className="text-3xl">👋</span>
        <div className="ml-3 flex items-end">
          <span className="text-3xl font-bold">Hey there! Setup</span>
          <ProjectFormButton />
        </div>
      </h1>
      <div className="mb-6">OpenReplay can be installed via script or NPM package (recommended).</div>
      <OnboardingTabs />
    </div>
  )
}
