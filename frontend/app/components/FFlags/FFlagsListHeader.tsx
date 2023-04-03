import React from 'react'
import { Button, PageTitle } from 'UI'
import FFlagsSearch from "Components/FFlags/FFlagsSearch";

function FFlagsListHeader() {

  return (
    <div className="flex items-center justify-between px-6">
      <div className="flex items-baseline mr-3">
        <PageTitle title="Feature Flags" />
      </div>
      <div className="ml-auto flex items-center">
        <Button variant="primary">
          Create Feature Flag
        </Button>
        <div className="mx-2"></div>
        <div className="w-1/4" style={{ minWidth: 300 }}>
          <FFlagsSearch />
        </div>
      </div>
    </div>
  )
}

export default FFlagsListHeader