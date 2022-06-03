import React, { useEffect, useState } from 'react';
import { SlideModal, NoContent, Dropdown, Icon, TimezoneDropdown, Loader } from 'UI';
import SessionItem from 'Shared/SessionItem';
import stl from './SessionListModal.module.css';
import { connect } from 'react-redux';
import { fetchSessionList, setActiveWidget } from 'Duck/customMetrics';
import { DateTime } from 'luxon';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
interface Props {
    loading: boolean;
    list: any;
    fetchSessionList: (params) => void;
    activeWidget: any;
    setActiveWidget: (widget) => void;
}
function SessionListModal(props: Props) {
    const { activeWidget, loading, list } = props;
    const [seriesOptions, setSeriesOptions] = useState([
        { text: 'All', value: 'all' },
    ]);
    const [activeSeries, setActiveSeries] = useState('all');
    useEffect(() => {
        if (!activeWidget || !activeWidget.widget) return;
        props.fetchSessionList({ 
            metricId: activeWidget.widget.metricId,
            startDate: activeWidget.startTimestamp,
            endDate: activeWidget.endTimestamp,
            filters: activeWidget.filters || [],
        });
    }, [activeWidget]);

    useEffect(() => {
        if (!list) return;
        const seriesOptions = list.map(item => ({
            text: item.seriesName,
            value: item.seriesId,
        }));
        setSeriesOptions([
            { text: 'All', value: 'all' },
            ...seriesOptions,
        ]);
    }, [list]);

    const getListSessionsBySeries = (seriesId) => {
        const arr: any = []
        list.forEach(element => {
            if (seriesId === 'all') {
                const sessionIds = arr.map(i => i.sessionId);
                arr.push(...element.sessions.filter(i => !sessionIds.includes(i.sessionId)));
            } else {
                if (element.seriesId === seriesId) {
                    arr.push(...element.sessions)
                }
            }
        });
        return arr;
    }

    const writeOption = (e, { name, value }) => setActiveSeries(value);
    const filteredSessions = getListSessionsBySeries(activeSeries);
    const startTime = DateTime.fromMillis(activeWidget.startTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const endTime = DateTime.fromMillis(activeWidget.endTimestamp).toFormat('LLL dd, yyyy HH:mm a');

    return (
        <SlideModal
            title={ activeWidget && (
                <div className="flex items-center">
                    <div className="mr-auto">{ activeWidget.widget.name } </div>
                </div>
            )}
            isDisplayed={ !!activeWidget }
            onClose={ () => props.setActiveWidget(null)}
            content={ activeWidget && (
                <div className={ stl.wrapper }>
                    <div className="mb-6 flex items-center">
                        <div className="mr-auto">Showing all sessions between <span className="font-medium">{startTime}</span> and <span className="font-medium">{endTime}</span> </div>
                        <div className="flex items-center ml-6">
                            <div className="flex items-center">
                                <span className="mr-2 color-gray-medium">Timezone</span>
                                <TimezoneDropdown />
                            </div>
                            { activeWidget.widget.metricType !== 'table' && (
                                <div className="flex items-center ml-6">
                                    <span className="mr-2 color-gray-medium">Series</span>
                                    <Dropdown
                                        className={stl.dropdown}
                                        direction="left"
                                        options={ seriesOptions }
                                        name="change"
                                        value={ activeSeries }
                                        onChange={ writeOption }
                                        id="change-dropdown"
                                        // icon={null}
                                        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
                                    />
                                </div>
                            )}
                            {/* <span className="mr-2 color-gray-medium">Series</span> */}
                        </div>
                    </div>
                    <Loader loading={loading}>
                        <NoContent 
                            show={ !loading && (filteredSessions.length === 0 )}
                            title={
                                <div className="flex flex-col items-center justify-center">
                                    <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                                    <div className="mt-6 text-2xl">No recordings found!</div>
                                </div>
                            }
                            // animatedIcon="no-results"
                        >
                            { filteredSessions.map(session => <SessionItem key={ session.sessionId } session={ session } />) }
                        </NoContent> 
                    </Loader>
                </div>
            )}
        />
    );
}

export default connect(state => ({
    loading: state.getIn(['customMetrics', 'fetchSessionList', 'loading']),
    list: state.getIn(['customMetrics', 'sessionList']),
    // activeWidget: state.getIn(['customMetrics', 'activeWidget']),
}), { fetchSessionList, setActiveWidget })(SessionListModal);
