import React from 'react'
import { PageTitle } from 'UI'
import { Button } from 'antd'
import FFlagsSearch from "Components/FFlags/FFlagsSearch";
import { useNavigate } from "react-router";
import { newFFlag, withSiteId } from 'App/routes';

function FFlagsListHeader({ siteId }: { siteId: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-6">
      <div className="flex items-center mr-3 gap-2">
        <PageTitle title="Feature Flags" />
      </div>
      <div className="ml-auto flex items-center">
        <Button type="primary" onClick={() => navigate(withSiteId(newFFlag(), siteId))}>
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

export default FFlagsListHeader;