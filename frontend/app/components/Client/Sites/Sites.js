import React from 'react';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { Loader, Button, TextLink, NoContent } from 'UI';
import { init, remove, fetchGDPR, setSiteId } from 'Duck/site';
import stl from './sites.module.css';
import NewSiteForm from './NewSiteForm';
import { confirm, PageTitle } from 'UI';
import SiteSearch from './SiteSearch';
import AddProjectButton from './AddProjectButton';
import InstallButton from './InstallButton';
import ProjectKey from './ProjectKey';
import { useModal } from 'App/components/Modal';
import { getInitials } from 'App/utils';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import cn from 'classnames'

const NEW_SITE_FORM = 'NEW_SITE_FORM';

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
        setSiteId,
    }
)
@withPageTitle('Projects - OpenReplay Preferences')
class Sites extends React.PureComponent {
    state = {
        searchQuery: '',
    };

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
            this.props.remove(site.id)
            this.props.setSiteId(null);
        }
    };

    render() {
        const { loading, sites, user } = this.props;
        const isAdmin = user.admin || user.superAdmin;
        const filteredSites = sites.filter((site) => site.name.toLowerCase().includes(this.state.searchQuery.toLowerCase()));

        return (
            <Loader loading={loading}>
                <div className={stl.wrapper}>
                    <div className={cn(stl.tabHeader, 'px-5 pt-5')}>
                        <PageTitle title={<div className="mr-4">Projects</div>} actionButton={<TextLink icon="book" href="https://docs.openreplay.com/installation" label="Installation Docs" />} />

                        <div className="flex ml-auto items-center">
                            <AddProjectButton isAdmin={isAdmin} />
                            <div className="mx-2" />
                            <SiteSearch onChange={(value) => this.setState({ searchQuery: value })} />
                        </div>
                    </div>

                    <div className={stl.list}>
                    <NoContent
                        title={
                            <div className="flex flex-col items-center justify-center">
                            <AnimatedSVG name={ICONS.NO_PROJECTS} size={170} />
                            <div className="text-center my-4">No matching results.</div>
                            </div>
                        }
                        size="small"
                        show={!loading && filteredSites.size === 0}
                    >
                        <div className="grid grid-cols-12 gap-2 w-full items-center px-5 py-3 font-medium">
                            <div className="col-span-4">Project Name</div>
                            <div className="col-span-4">Key</div>
                            <div className="col-span-4"></div>
                        </div>
                        {filteredSites.map((_site) => (
                            <div
                                key={_site.key}
                                className="grid grid-cols-12 gap-2 w-full group hover:bg-active-blue items-center border-t px-5 py-3"
                            >
                                <div className="col-span-4">
                                    <div className="flex items-center">
                                        <div className="relative flex items-center justify-center w-10 h-10">
                                            <div
                                                className="absolute left-0 right-0 top-0 bottom-0 mx-auto w-10 h-10 rounded-full opacity-30 bg-tealx"
                                            />
                                            <div className="text-lg uppercase color-tealx">
                                                {getInitials(_site.name)}
                                            </div>
                                        </div>
                                        <span className="ml-2">{_site.host}</span>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <ProjectKey value={_site.projectKey} tooltip="Project key copied to clipboard" />
                                </div>
                                <div className="col-span-4 justify-self-end flex items-center">
                                    <div className="mr-4">
                                        <InstallButton site={_site} />
                                    </div>
                                    <div className="invisible group-hover:visible">
                                        <EditButton isAdmin={isAdmin} onClick={() => this.props.init(_site)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        </NoContent>
                    </div>
                </div>
            </Loader>
        );
    }
}

export default Sites;

function EditButton({ isAdmin, onClick }) {
    const { showModal, hideModal } = useModal();
    const _onClick = () => {
        onClick();
        showModal(<NewSiteForm onClose={hideModal} />);
    };
    return <Button icon="edit" variant="text-primary" disabled={!isAdmin} onClick={_onClick} />;
}
