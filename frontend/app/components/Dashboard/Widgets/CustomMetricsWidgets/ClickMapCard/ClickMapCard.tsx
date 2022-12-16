import React from 'react'
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import WebPlayer from 'App/components/Session/WebPlayer'
// inject mob file from chalice
import { connect } from 'react-redux'
import { setCustomSession } from 'App/duck/sessions'

function ClickMapCard({ setCustomSession, visitedEvents }) {
  const { metricStore } = useStore()
  React.useEffect(() => {
    if (metricStore.instance.data.mobsUrl) {
      setCustomSession(metricStore.instance.data)
    }
  }, [metricStore.instance.data.mobsUrl])

  if (!metricStore.instance.data.mobsUrl) return <div>looking for session</div>
  console.log(visitedEvents, metricStore.instance.data.events)
  if (!visitedEvents || !visitedEvents.length) {
    return <div>loading</div>
  }
  return (
    <div>
        <WebPlayer isClickmap customSession={metricStore.instance.data}/>
    </div>
  )
}

export default connect((state: any) => ({ visitedEvents: state.getIn(['sessions', 'visitedEvents']) }), {setCustomSession})(
  observer(ClickMapCard)
)
