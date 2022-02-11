import React from 'react';
import { connect } from 'react-redux';
import stl from './savedSearchList.css';
import cn from 'classnames';
import { Icon, IconButton, Loader, Button } from 'UI';
import { confirm } from 'UI/Confirmation';
import { withRouter } from 'react-router-dom';
import { addFilterByKeyAndValue } from 'Duck/search';
import {
    fetchList as fetchFunnelsList,
    applySavedFilter,
    remove as deleteSearch,
    setActiveFlow,
    clearEvents,
    init
} from 'Duck/funnels';
import { setActiveTab } from 'Duck/sessions';
import { funnel as funnelRoute, withSiteId } from 'App/routes';
import Event, { TYPES } from 'Types/filter/event';
import FunnelMenuItem from 'Components/Funnels/FunnelMenuItem';
import FunnelSaveModal from 'Components/Funnels/FunnelSaveModal';
import { blink as setBlink } from 'Duck/funnels';
import { FilterKey } from 'Types/filter/filterType';

const DEFAULT_VISIBLE = 3;
@withRouter
class SavedSearchList extends React.Component {
    state = { showMore: false, showSaveModal: false }

    setFlow = flow => {
        this.props.setActiveTab({ name: 'All', type: 'all' });
        this.props.setActiveFlow(flow)
        if (flow && flow.type === 'flows') {
            this.props.clearEvents()
        }
    }

    renameHandler = funnel => {        
        this.props.init(funnel);
        this.setState({ showSaveModal: true })
    }

    deleteSearch = async (e, funnel) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (await confirm({
            header: 'Delete Funnel',
            confirmButton: 'Delete',
            confirmation: `Are you sure you want to permanently delete "${funnel.name}"?`
        })) {
            this.props.deleteSearch(funnel.funnelId).then(function() {
                this.props.fetchFunnelsList();
                this.setState({ showSaveModal: false })
            }.bind(this));
        } else {}
    }

    createHandler = () => {
        const { filters } = this.props;
        if (filters.size === 0) {
            this.props.addFilterByKeyAndValue(FilterKey.LOCATION, '');
            this.props.addFilterByKeyAndValue(FilterKey.LOCATION, '');
            this.props.addFilterByKeyAndValue(FilterKey.CLICK, '')
        } else {
            this.props.setBlink()
        }
    }

    onFlowClick = ({ funnelId }) => {
        const { siteId, history } = this.props; 
        history.push(withSiteId(funnelRoute(funnelId), siteId));
    }

    render() {
        const { funnels, activeFlow, activeTab, loading } = this.props;
        const { showMore, showSaveModal } = this.state;
        const shouldLimit = funnels.size > DEFAULT_VISIBLE;

        return (
            <div className={ stl.wrapper }>
                <FunnelSaveModal
                    show={showSaveModal}
                    closeHandler={() => this.setState({ showSaveModal: false })}
                />
                <Loader loading={loading} size="small">
                    <div className={ cn(stl.header, 'mt-3') }>
                        <div className={ cn(stl.label, 'flex items-center relative') }>                            
                            <span className="mr-2">Funnels</span>
                            
                            { funnels.size > 0 && (
                                <IconButton 
                                    tooltip="Create Funnel"
                                    circle
                                    size="small"
                                    icon="plus" 
                                    outline
                                    onClick={ this.createHandler }
                                />
                            )}
                        </div>
                    </div>
                    { funnels.size === 0 &&
                        <div className="flex flex-col">
                            <div className="color-gray-medium text-justify font-light mb-2">
                                Funnels makes it easy to uncover the most significant issues that impacted conversions.
                            </div>
                            <IconButton className="-ml-2" icon="plus" label="Create Funnel" primaryText onClick={ this.createHandler } />
                        </div>
                    }
                    { funnels.size > 0 &&
                        <React.Fragment>                        
                            { funnels.take(showMore ? funnels.size : DEFAULT_VISIBLE).map(filter => (
                                <div key={filter.key}>
                                    <FunnelMenuItem                                
                                        title={filter.name}
                                        isPublic={filter.isPublic}
                                        iconName="filter"
                                        active={activeFlow && activeFlow.funnelId === filter.funnelId && activeTab.type !== 'flows'}
                                        onClick={ () => this.onFlowClick(filter)}
                                        deleteHandler={ (e) => this.deleteSearch(e, filter) }
                                        renameHandler={() => this.renameHandler(filter)}
                                    />
                                </div>
                            ))}
                            { shouldLimit && 
                                <div
                                    onClick={() => this.setState({ showMore: !showMore})}
                                    className={cn(stl.showMore, 'cursor-pointer py-2 flex items-center')}
                                >
                                    {/* <Icon name={showMore ? 'arrow-up' : 'arrow-down'} size="16"/> */}
                                    <span className="ml-4 color-teal text-sm">{ showMore ? 'SHOW LESS' : 'SHOW MORE' }</span>
                                </div>
                            }
                        </React.Fragment>
                    }
                </Loader>
            </div>
        );
    }
}

export default connect(state => ({
    funnels: state.getIn([ 'funnels', 'list' ]),
    loading: state.getIn(['funnels', 'fetchListRequest', 'loading']),
    activeFlow: state.getIn([ 'filters', 'activeFlow' ]),
    activeTab: state.getIn([ 'sessions', 'activeTab' ]),
    siteId: state.getIn([ 'user', 'siteId' ]),
    events: state.getIn([ 'filters', 'appliedFilter', 'events' ]),
    filters: state.getIn([ 'search', 'instance', 'filters' ]),
}), { 
    applySavedFilter,
    deleteSearch, setActiveTab,
    setActiveFlow, clearEvents,
    addFilterByKeyAndValue,
    init,
    fetchFunnelsList,
    setBlink
})(SavedSearchList)
