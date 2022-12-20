import React from 'react'
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import WebPlayer from 'App/components/Session/WebPlayer'
import { connect } from 'react-redux'
import { setCustomSession } from 'App/duck/sessions'

function ClickMapCard({ setCustomSession, visitedEvents }: any) {
    const { metricStore } = useStore();
    const onMarkerClick = (s: string) => console.log(s)

    React.useEffect(() => {
        if (metricStore.instance.data.mobsUrl) {
            setCustomSession(metricStore.instance.data)
        }
    }, [metricStore.instance.data.mobsUrl])

    if (!metricStore.instance.data?.mobsUrl) return <div className="p-2">No Data for selected period or URL.</div>
    if (!visitedEvents || !visitedEvents.length) {
        return <div className="p-2">Loading session</div>
    }

    const searchUrl = metricStore.instance.series[0].filter.filters[0].value[0]
    const jumpToEvent = metricStore.instance.data.events.find((evt: Record<string, any>) => {
        if (searchUrl) return evt.path.includes(searchUrl)
        return evt
    })
    const jumpTimestamp = (jumpToEvent.timestamp - metricStore.instance.data.startTs) + jumpToEvent.domBuildingTime
    return (
        <div id="clickmap-render">
            <WebPlayer
                isClickmap
                customSession={metricStore.instance.data}
                customTimestamp={jumpTimestamp}
                onMarkerClick={onMarkerClick}
            />
        </div>
    )
}

export default connect(
    (state: any) => ({ visitedEvents: state.getIn(['sessions', 'visitedEvents']) }),
    { setCustomSession })
(observer(ClickMapCard))
