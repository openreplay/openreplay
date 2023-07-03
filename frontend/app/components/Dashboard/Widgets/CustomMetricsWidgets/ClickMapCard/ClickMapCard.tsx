import React from 'react'
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import ClickMapRenderer from 'App/components/Session/Player/ClickMapRenderer'
import { connect } from 'react-redux'
import { setCustomSession, clearCurrentSession } from 'App/duck/sessions'
import { fetchInsights } from 'Duck/sessions';
import { NoContent, Icon } from 'App/components/ui'

function ClickMapCard({
    setCustomSession,
    visitedEvents,
    insights,
    fetchInsights,
    insightsFilters,
    host,
    clearCurrentSession,
}: any) {
    const { metricStore, dashboardStore } = useStore();
    const onMarkerClick = (s: string, innerText: string) => {
        metricStore.changeClickMapSearch(s, innerText)
    }
    const mapUrl = metricStore.instance.series[0].filter.filters[0].value[0]

    React.useEffect(() => {
        return () => clearCurrentSession()
    }, [])
    React.useEffect(() => {
        if (metricStore.instance.data.domURL) {
            setCustomSession(metricStore.instance.data)
        }
    }, [metricStore.instance])

    React.useEffect(() => {
        if (visitedEvents.length) {
            const rangeValue = dashboardStore.drillDownPeriod.rangeValue
            const startDate = dashboardStore.drillDownPeriod.start
            const endDate = dashboardStore.drillDownPeriod.end
            fetchInsights({ ...insightsFilters, url: mapUrl || '/', startDate, endDate, rangeValue, clickRage: metricStore.clickMapFilter })
        }
    }, [visitedEvents, metricStore.clickMapFilter])

    if (!metricStore.instance.data.domURL || insights.size === 0) {
        return (
            <NoContent
                style={{ minHeight: 220 }}
                title={
                    <div className="flex items-center relative">
                        <Icon name="info-circle" className="mr-2" size="18" />
                        No data for selected period or URL
                        <div style={{ position: 'absolute', right: -240, top: -110 }}>
                            <Icon name="pointer-sessions-search" size={250} width={240} />
                        </div>
                    </div>
                }
                show={true}
            />
        )
    }
    if (!visitedEvents || !visitedEvents.length) {
        return <div className="py-2">Loading session</div>
    }

    const jumpToEvent = metricStore.instance.data.events.find((evt: Record<string, any>) => {
        if (mapUrl) return evt.path.includes(mapUrl)
        return evt
    }) || { timestamp: metricStore.instance.data.startTs }

    const jumpTimestamp = (jumpToEvent.timestamp - metricStore.instance.data.startTs) + jumpToEvent.domBuildingTime + 99 // 99ms safety margin to give some time for the DOM to load

    return (
        <div id="clickmap-render">
            <ClickMapRenderer
                customSession={metricStore.instance.data}
                jumpTimestamp={jumpTimestamp}
                onMarkerClick={onMarkerClick}
            />
        </div>
    )
}

export default connect(
    (state: any) => ({
        insightsFilters: state.getIn(['sessions', 'insightFilters']),
        visitedEvents: state.getIn(['sessions', 'visitedEvents']),
        insights: state.getIn(['sessions', 'insights']),
        host: state.getIn(['sessions', 'host']),
    }),
    { setCustomSession, fetchInsights, clearCurrentSession }
)
(observer(ClickMapCard))
