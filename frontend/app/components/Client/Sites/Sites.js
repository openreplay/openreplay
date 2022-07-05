import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { Loader, SlideModal, Icon, Button, Popup, TextLink } from 'UI';
import { init, remove, fetchGDPR } from 'Duck/site';
import { RED, YELLOW, GREEN, STATUS_COLOR_MAP } from 'Types/site';
import stl from './sites.module.css';
import NewSiteForm from './NewSiteForm';
import GDPRForm from './GDPRForm';
import TrackingCodeModal from 'Shared/TrackingCodeModal';
import BlockedIps from './BlockedIps';
import { confirm, PageTitle } from 'UI';
import SiteSearch from './SiteSearch';
import AddProjectButton from './AddProjectButton';

const STATUS_MESSAGE_MAP = {
    [RED]: ' There seems to be an issue (please verify your installation)',
    [YELLOW]: "We're collecting data from time to time (perhaps low traffic)",
    [GREEN]: 'All good!',
};

const BLOCKED_IPS = 'BLOCKED_IPS';
const NONE = 'NONE';

const NEW_SITE_FORM = 'NEW_SITE_FORM';
const GDPR_FORM = 'GDPR_FORM';

@connect(
    (state) => ({
        site: state.getIn(['site', 'instance']),
        sites: state.getIn(['site', 'list']),
        loading: state.getIn(['site', 'loading']),
        user: state.getIn(['user', 'account']),
        account: state.getIn(['user', 'account']),
    }),
    {
        init,
        remove,
        fetchGDPR,
    }
)
@withPageTitle('Projects - OpenReplay Preferences')
class Sites extends React.PureComponent {
    state = {
        showTrackingCode: false,
        modalContent: NONE,
        detailContent: NONE,
        searchQuery: '',
    };

    toggleBlockedIp = () => {
        this.setState({
            detailContent: this.state.detailContent === BLOCKED_IPS ? NONE : BLOCKED_IPS,
        });
    };

    closeModal = () => this.setState({ modalContent: NONE, detailContent: NONE });

    edit = (site) => {
        this.props.init(site);
        this.setState({ modalContent: NEW_SITE_FORM });
    };

    remove = async (site) => {
        if (
            await confirm({
                header: 'Projects',
                confirmation: `Are you sure you want to delete this Project? We won't be able to record anymore sessions.`,
            })
        ) {
            this.props.remove(site.id);
        }
    };

    showGDPRForm = (site) => {
        this.props.init(site);
        this.setState({ modalContent: GDPR_FORM });
    };

    showNewSiteForm = () => {
        this.props.init();
        this.setState({ modalContent: NEW_SITE_FORM });
    };

    showTrackingCode = (site) => {
        this.props.init(site);
        this.setState({ showTrackingCode: true });
    };

    getModalTitle() {
        switch (this.state.modalContent) {
            case NEW_SITE_FORM:
                return this.props.site.exists() ? 'Update Project' : 'New Project';
            case GDPR_FORM:
                return 'Project Settings';
            default:
                return '';
        }
    }

    renderModalContent() {
        switch (this.state.modalContent) {
            case NEW_SITE_FORM:
                return <NewSiteForm onClose={this.closeModal} />;
            case GDPR_FORM:
                return <GDPRForm onClose={this.closeModal} toggleBlockedIp={this.toggleBlockedIp} />;
            default:
                return null;
        }
    }

    renderModalDetailContent() {
        switch (this.state.detailContent) {
            case BLOCKED_IPS:
                return <BlockedIps />;
            default:
                return null;
        }
    }

    render() {
        const { loading, sites, site, user, account } = this.props;
        const { modalContent, showTrackingCode } = this.state;
        const isAdmin = user.admin || user.superAdmin;
        const filteredSites = sites.filter((site) => site.name.toLowerCase().includes(this.state.searchQuery.toLowerCase()));

        return (
            <Loader loading={loading}>
                <TrackingCodeModal
                    title="Tracking Code"
                    subTitle={`(Unique to ${site.host})`}
                    displayed={showTrackingCode}
                    onClose={() => this.setState({ showTrackingCode: false })}
                    site={site}
                />
                <SlideModal
                    title={this.getModalTitle()}
                    size="small"
                    isDisplayed={modalContent !== NONE}
                    content={this.renderModalContent()}
                    onClose={this.closeModal}
                    detailContent={this.renderModalDetailContent()}
                />
                <div className={stl.wrapper}>
                    <div className={stl.tabHeader}>
                        <PageTitle
                            title={<div className="mr-4">Projects</div>}
                            actionButton={<AddProjectButton isAdmin={isAdmin} onClick={this.showNewSiteForm} />}
                        />

                        <div className="flex ml-auto items-center">
                            <TextLink icon="book" className="mr-4" href="https://docs.openreplay.com/installation" label="Documentation" />
                            <SiteSearch onChange={(value) => this.setState({ searchQuery: value })} />
                        </div>
                    </div>

                    <div className={stl.list}>
                        <div className="grid grid-cols-12 gap-2 w-full items-center border-b px-2 py-3 font-medium">
                            <div className="col-span-4">Name</div>
                            <div className="col-span-4">Key</div>
                            <div className="col-span-4"></div>
                        </div>
                        {filteredSites.map((_site) => (
                            <div
                                key={_site.key}
                                className="grid grid-cols-12 gap-2 w-full group hover:bg-active-blue items-center border-b px-2 py-3"
                            >
                                <div className="col-span-4">
                                    <div className="flex items-center">
                                        <Popup content={STATUS_MESSAGE_MAP[_site.status]} inverted position="top center">
                                            <div style={{ width: '10px' }}>
                                                <Icon name="circle" size="10" color={STATUS_COLOR_MAP[_site.status]} />
                                            </div>
                                        </Popup>
                                        <span className="ml-2">{_site.host}</span>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <span className="px-2 py-1 bg-gray-lightest rounded border text-sm">{_site.projectKey}</span>
                                </div>
                                <div className="col-span-4 justify-self-end flex items-center">
                                    <div className="mr-4">
                                        <Button size="small" variant="primary" onClick={() => this.showTrackingCode(_site)}>
                                            {'Installation Steps'}
                                        </Button>
                                    </div>
                                    <div className="invisible group-hover:visible">
                                        <Button
                                            variant="text"
                                            className={cn('mx-3', { hidden: !isAdmin })}
                                            disabled={!isAdmin}
                                            onClick={() => isAdmin && this.edit(_site)}
                                            data-clickable
                                        >
                                            <Icon name="edit" size="16" color="teal" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Loader>
        );
    }
}

export default Sites;
