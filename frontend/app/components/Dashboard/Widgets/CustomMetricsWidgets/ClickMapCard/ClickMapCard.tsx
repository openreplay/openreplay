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

  if (!metricStore.instance.data?.mobsUrl) return <div className="p-4">looking for session</div>
  console.log(visitedEvents, metricStore.instance.data.events)
  if (!visitedEvents || !visitedEvents.length) {
    return <div className="p-4">loading</div>
  }
  const searchUrl = metricStore.instance.series[0].filter.filters[0].value[0]
  const jumpToEvent = metricStore.instance.data.events.find((evt: Record<string, any>) => {
    if (searchUrl) return evt.path.includes(searchUrl)
    return evt
  })
  const jumpTimestamp = (jumpToEvent.timestamp - metricStore.instance.data.startTs) + jumpToEvent.domBuildingTime
  console.log(jumpTimestamp, jumpToEvent, searchUrl)
  return (
    <div>
        <WebPlayer isClickmap customSession={metricStore.instance.data} customTimestamp={jumpTimestamp} />
    </div>
  )
}

export default connect((state: any) => ({ visitedEvents: state.getIn(['sessions', 'visitedEvents']) }), {setCustomSession})(
  observer(ClickMapCard)
)
