import React, { useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Drawer } from 'antd';
import cn from 'classnames';
import {
  Loader,
  Button,
  TextLink,
  NoContent,
  Pagination,
  PageTitle, Divider
} from 'UI';
import {
  init,
  remove,
  fetchGDPR,
  setSiteId
} from 'Duck/site';
import withPageTitle from 'HOCs/withPageTitle';
import stl from './sites.module.css';
import NewSiteForm from './NewSiteForm';
import SiteSearch from './SiteSearch';
import AddProjectButton from './AddProjectButton';
import InstallButton from './InstallButton';
import ProjectKey from './ProjectKey';
import { getInitials, sliceListPerPage } from 'App/utils';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';
import CaptureRate from 'Shared/SessionSettings/components/CaptureRate';

type Project = {
  id: number;
  name: string;
  host: string;
  projectKey: string;
  sampleRate: number;
};

type PropsFromRedux = ConnectedProps<typeof connector>;

const Sites = ({
                 loading,
                 sites,
                 user,
                 init
               }: PropsFromRedux) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCaptureRate, setShowCaptureRate] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [page, setPage] = useState(1);
  const pageSize: number = 10;

  const isAdmin = user.admin || user.superAdmin;
  const filteredSites = sites.filter((site: { name: string }) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { showModal, hideModal } = useModal();

  const EditButton = ({
                        isAdmin,
                        onClick
                      }: {
    isAdmin: boolean;
    onClick: () => void;
  }) => {
    const _onClick = () => {
      onClick();
      showModal(<NewSiteForm onClose={hideModal} />, { right: true });
    };

    return (
      <Button
        icon='edit'
        variant='text-primary'
        disabled={!isAdmin}
        onClick={_onClick}
      />
    );
  };

  const captureRateClickHandler = (project: Project) => {
    setActiveProject(project);
    setShowCaptureRate(true);
  };

  const updatePage = (page: number) => {
    setPage(page);
  };

  const ProjectItem = ({ project }: { project: Project }) => (
    <div
      key={project.id}
      className='grid grid-cols-12 gap-2 w-full group hover:bg-active-blue items-center px-5 py-3'
    >
      <div className='col-span-4'>
        <div className='flex items-center'>
          <div className='relative flex items-center justify-center w-10 h-10'>
            <div
              className='absolute left-0 right-0 top-0 bottom-0 mx-auto w-10 h-10 rounded-full opacity-30 bg-tealx' />
            <div className='text-lg uppercase color-tealx'>
              {getInitials(project.name)}
            </div>
          </div>
          <span className='ml-2'>{project.host}</span>
        </div>
      </div>
      <div className='col-span-3'>
        <ProjectKey
          value={project.projectKey}
          tooltip='Project key copied to clipboard'
        />
      </div>
      <div className='col-span-2'>
        <Button
          variant='text-primary'
          onClick={() => captureRateClickHandler(project)}
        >
          {project.sampleRate}%
        </Button>
      </div>
      <div className='col-span-3 justify-self-end flex items-center'>
        <div className='mr-4'>
          <InstallButton site={project} />
        </div>
        <div className='invisible group-hover:visible'>
          <EditButton isAdmin={isAdmin} onClick={() => init(project)} />
        </div>
      </div>
    </div>
  );

  return (
    <Loader loading={loading}>
      <div className={stl.wrapper}>
        <div className={cn(stl.tabHeader, 'px-5 pt-5')}>
          <PageTitle
            title={<div className='mr-4'>Projects</div>}
            actionButton={
              <TextLink
                icon='book'
                href='https://docs.openreplay.com/installation'
                label='Installation Docs'
              />
            }
          />

          <div className='flex ml-auto items-center'>
            <AddProjectButton isAdmin={isAdmin} />
            <div className='mx-2' />
            <SiteSearch onChange={(value) => setSearchQuery(value)} />
          </div>
        </div>

        <div className={stl.list}>
          <NoContent
            title={
              <div className='flex flex-col items-center justify-center'>
                <AnimatedSVG name={ICONS.NO_PROJECTS} size={170} />
                <div className='text-center text-gray-600 my-4'>
                  No matching results
                </div>
              </div>
            }
            size='small'
            show={!loading && filteredSites.size === 0}
          >
            <div className='grid grid-cols-12 gap-2 w-full items-center px-5 py-3 font-medium'>
              <div className='col-span-4'>Project Name</div>
              <div className='col-span-3'>Key</div>
              <div className='col-span-2'>Capture Rate</div>
              <div className='col-span-3'></div>
            </div>
            <Divider className='m-0' />
            
            {sliceListPerPage(filteredSites, page - 1, pageSize).map(
              (project: Project) => (
                <>
                  <ProjectItem project={project} />
                  <Divider className='m-0' />
                </>
              )
            )}

            <div className='w-full flex items-center justify-center py-10'>
              <Pagination
                page={page}
                totalPages={Math.ceil(filteredSites.size / pageSize)}
                onPageChange={(page) => updatePage(page)}
                limit={pageSize}
              />
            </div>
          </NoContent>
        </div>
      </div>

      <Drawer
        open={showCaptureRate && !!activeProject}
        onClose={() => setShowCaptureRate(!showCaptureRate)}
        title='Capture Rate'
        closable={false}
        destroyOnClose
      >
        {activeProject && <CaptureRate projectId={activeProject.id} />}
      </Drawer>
    </Loader>
  );
};

const mapStateToProps = (state: any) => ({
  site: state.getIn(['site', 'instance']),
  sites: state.getIn(['site', 'list']),
  loading: state.getIn(['site', 'loading']),
  user: state.getIn(['user', 'account']),
  account: state.getIn(['user', 'account'])
});

const connector = connect(mapStateToProps, {
  init,
  remove,
  fetchGDPR,
  setSiteId
});

export default connector(withPageTitle('Projects - OpenReplay Preferences')(Sites));
