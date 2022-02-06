import React, { useEffect, useState } from 'react';
import { SlideModal, NoContent, Dropdown } from 'UI';
import SessionItem from 'Shared/SessionItem';
import stl from './SessionListModal.css';
import { connect } from 'react-redux';
import { fetchSessionList, setActiveWidget } from 'Duck/customMetrics';

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
    return (
        <SlideModal
            title={ activeWidget && (
                <div className="flex items-center">
                    <div className="mr-auto">{ 'Custom Metric: ' + activeWidget.widget.name } </div>
                    <div className="text-base">
                        <Dropdown
                            className="w-4/6"
                            placeholder="change"
                            selection
                            options={ seriesOptions }
                            name="change"
                            value={ activeSeries }
                            onChange={ writeOption }
                            id="change-dropdown"
                        />
                    </div>
                </div>
            )}
            isDisplayed={ !!activeWidget }
            onClose={ () => props.setActiveWidget(null)}
            content={ activeWidget && (
                <div className="">
                    <NoContent 
                        show={ !loading && (filteredSessions.length === 0 || filteredSessions.size === 0 )}
                        title="No recordings found."
                    >
                        <div className={ stl.wrapper }>
                            { filteredSessions.map(session => <SessionItem key={ session.sessionId } session={ session } />) }
                        </div>
                    </NoContent> 
                </div>
            )}
        />
    );
}

export default connect(state => ({
    loading: state.getIn(['customMetrics', 'sessionListRequest', 'loading']),
    list: state.getIn(['customMetrics', 'sessionList']),
    activeWidget: state.getIn(['customMetrics', 'activeWidget']),
}), { fetchSessionList, setActiveWidget })(SessionListModal);
