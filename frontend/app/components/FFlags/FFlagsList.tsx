import React from 'react'
import FFlagsListHeader from "Components/FFlags/FFlagsListHeader";
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NoContent } from 'UI'

function FFlagsList({ siteId }: { siteId: string }) {

  return (
    <div
      className={'mb-5 w-full mx-auto bg-white rounded px-4 pb-10 pt-4 widget-wrapper'}
      style={{ maxWidth: '1300px' }}
    >
      <FFlagsListHeader siteId={siteId} />

      <div className="w-full h-full">
        <NoContent
          show
          title={
            <div className={'flex flex-col items-center justify-center'}>
              <AnimatedSVG name={ICONS.NO_FFLAGS} size={285} />
              <div className="text-center text-gray-600 mt-4">You haven't created any feature flags yet.</div>
            </div>
          }
          subtext={
            <div className="text-center flex justify-center items-center flex-col">
              Use feature flags to simply deploy and rollback new functionality with ease.
            </div>
          }
        />
      </div>
    </div>
  )
}

export default FFlagsList