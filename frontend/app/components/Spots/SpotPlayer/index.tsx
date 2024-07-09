import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'App/mstore'
import { useParams } from 'react-router-dom'

function SpotPlayer() {
  const { spotStore } = useStore()
  const { spotId } = useParams<{ spotId: string }>()

  React.useEffect(() => {
    void spotStore.fetchSpotById(spotId)
  }, [])

  console.log(spotStore.currentSpot)
  return (
    <div>
      SpotPlayer
    </div>
  )
}

export default observer(SpotPlayer)