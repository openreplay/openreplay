import React, { useEffect, useState } from 'react';
import { SlideModal, NoContent, Dropdown, Icon } from 'UI';
import SessionItem from 'Shared/SessionItem';
import stl from './SessionListModal.css';
import { connect } from 'react-redux';
import { fetchSessionList, setActiveWidget } from 'Duck/customMetrics';
import { DateTime } from 'luxon';

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
            endDate: activeWidget.endTimestamp
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

    const writeOption = (e, { name, value }) => setActiveSeries(value);

    const filteredSessions = activeSeries === 'all' ? list.reduce((a, b) => a.concat(b.sessions), []) : list.filter(item => item.seriesId === activeSeries).reduce((a, b) => a.concat(b.sessions), []);
    const startTime = new DateTime(activeWidget.startTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const endTime = new DateTime(activeWidget.endTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    return (
        <SlideModal
            title={ activeWidget && (
                <div className="flex items-center">
                    <div className="mr-auto">{ 'Custom Metric: ' + activeWidget.widget.name } </div>
                </div>
            )}
            isDisplayed={ !!activeWidget }
            onClose={ () => props.setActiveWidget(null)}
            content={ activeWidget && (
                <div className={ stl.wrapper }>
                    <div className="mb-6 flex items-center">
                        <div className="mr-auto">Showing all sessions between <span className="font-medium">{startTime}</span> and <span className="font-medium">{endTime}</span> </div>
                        <div className="flex items-center ml-6">
                            <span className="mr-2 color-gray-medium">Series: </span>
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
                    </div>
                    <NoContent 
                        show={ !loading && (filteredSessions.length === 0 || filteredSessions.size === 0 )}
                        title="No recordings found."
                    >
                        { filteredSessions.map(session => <SessionItem key={ session.sessionId } session={ session } />) }
                    </NoContent> 
                </div>
            )}
        />
    );
}

export default connect(state => ({
    loading: state.getIn(['customMetrics', 'sessionListRequest', 'loading']),
    list: state.getIn(['customMetrics', 'sessionList']),
    // activeWidget: state.getIn(['customMetrics', 'activeWidget']),
}), { fetchSessionList, setActiveWidget })(SessionListModal);
