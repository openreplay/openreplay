import React from 'react'
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import WebPlayer from 'App/components/Session/WebPlayer'
import { connect } from 'react-redux'
import { setCustomSession } from 'App/duck/sessions'

// TODO session type ???
function ClickMapCard({ setCustomSession, visitedEvents }: any) {
  const { metricStore } = useStore()
  React.useEffect(() => {
    if (metricStore.instance.data.mobsUrl) {
      setCustomSession(metricStore.instance.data)
    }
  }, [metricStore.instance.data.mobsUrl])

  if (!metricStore.instance.data.mobsUrl) return <div className="p-4">looking for session</div>
  console.log(visitedEvents, metricStore.instance.data.events)
  if (!visitedEvents || !visitedEvents.length) {
    return <div className="p-4">loading</div>
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
