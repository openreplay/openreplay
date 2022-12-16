import React from 'react'
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import { toJS } from 'mobx'
// import WebPlayer from "Player/web/WebPlayer";
// inject mob file from chalice

function ClickMapCard() {
  const { metricStore } = useStore()

  // console.log(toJS(metricStore.instance))
  return (
    <div>this is a card</div>
  )
}

export default observer(ClickMapCard)
