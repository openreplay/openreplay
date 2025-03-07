import React, { useState } from 'react';
import { Tag, Button } from 'antd';
import cn from 'classnames';
import {
  Loader,
  TextLink,
  NoContent,
  Pagination,
  PageTitle,
  Divider,
  Icon,
} from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { sliceListPerPage } from 'App/utils';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';
import CaptureRate from 'Shared/SessionSettings/components/CaptureRate';
import { BranchesOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ProjectKey from './ProjectKey';
import InstallButton from './InstallButton';
import AddProjectButton from './AddProjectButton';
import SiteSearch from './SiteSearch';
import NewSiteForm from './NewSiteForm';
import stl from './sites.module.css';
import { useTranslation } from 'react-i18next';

type Project = {
  id: string;
  name: string;
  conditionsCount: number;
  platform: 'web' | 'mobile';
  host: string;
  projectKey: string;
  sampleRate: number;
};

function Sites() {
  const { t } = useTranslation();
  const { projectsStore, userStore } = useStore();
  const user = userStore.account;
  const sites = projectsStore.list;
  const loading = projectsStore.sitesLoading;
  const init = projectsStore.initProject;
  const [searchQuery, setSearchQuery] = useState('');
  const [showCaptureRate, setShowCaptureRate] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [page, setPage] = useState(1);
  const pageSize: number = 10;

  const isAdmin = user.admin || user.superAdmin;
  const filteredSites = sites.filter((site: { name: string }) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const { showModal, hideModal } = useModal();

  function EditButton({
    isAdmin,
    onClick,
  }: {
    isAdmin: boolean;
    onClick: () => void;
  }) {
    const _onClick = () => {
      onClick();
      showModal(<NewSiteForm onClose={hideModal} />, { right: true });
    };

    return (
      <Button
        icon={<Icon name="edit" />}
        type="text"
        disabled={!isAdmin}
        onClick={_onClick}
      />
    );
  }

  const captureRateClickHandler = (project: Project) => {
    setActiveProject(project);
    setShowCaptureRate(true);
  };

  const updatePage = (page: number) => {
    setPage(page);
  };

  function ProjectItem({ project }: { project: Project }) {
    return (
      <div
        key={project.id}
        className="grid grid-cols-12 gap-2 w-full group hover:bg-active-blue items-center px-5 py-3"
      >
        <div className="col-span-4">
          <div className="flex items-center">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-tealx-light">
              <Icon
                color="tealx"
                size={18}
                name={project.platform === 'web' ? 'browser/browser' : 'mobile'}
              />
            </div>
            <span className="ml-2">{project.host}</span>
            <div className="ml-4 flex items-center gap-2">
              {project.platform === 'web' ? null : (
                <Tag bordered={false} color="green">
                  {t('MOBILE BETA')}
                </Tag>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <ProjectKey
            value={project.projectKey}
            tooltip={t('Project key copied to clipboard')}
          />
        </div>
        <div className="col-span-3 flex items-center">
          <Button type="text" onClick={() => captureRateClickHandler(project)}>
            {project.sampleRate}%
          </Button>
          {project.conditionsCount > 0 ? (
            <Button
              variant="text"
              onClick={() => captureRateClickHandler(project)}
              className="ml-2"
            >
              <BranchesOutlined rotate={90} /> {project.conditionsCount}{' '}
              {t('Conditions')}
            </Button>
          ) : null}
        </div>
        <div className="col-span-2 justify-self-end flex items-center">
          <div className="mr-4">
            <InstallButton site={project} />
          </div>
          <div className="invisible group-hover:visible">
            <EditButton isAdmin={isAdmin} onClick={() => init(project)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Loader loading={loading}>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className={cn(stl.tabHeader, 'px-5 pt-5')}>
          <PageTitle
            title={<div className="mr-4">{t('Projects')}</div>}
            actionButton={
              <TextLink
                icon="book"
                href="https://docs.openreplay.com/deployment/setup-or"
                label={t('Installation Docs')}
              />
            }
          />

          <div className="flex ml-auto items-center">
            <AddProjectButton isAdmin={isAdmin} />
            <div className="mx-2" />
            <SiteSearch onChange={(value) => setSearchQuery(value)} />
          </div>
        </div>

        <div className={stl.list}>
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_PROJECTS} size={60} />
                <div className="text-center text-gray-600 my-4">
                  {t('No matching results')}
                </div>
              </div>
            }
            size="small"
            show={!loading && filteredSites.length === 0}
          >
            <div className="grid grid-cols-12 gap-2 w-full items-center px-5 py-3 font-medium">
              <div className="col-span-4">{t('Project Name')}</div>
              <div className="col-span-3">{t('Key')}</div>
              <div className="col-span-2">{t('Capture Rate')}</div>
              <div className="col-span-3" />
            </div>
            <Divider className="m-0" />

            {sliceListPerPage(filteredSites, page - 1, pageSize).map(
              (project: Project) => (
                <React.Fragment key={project.id}>
                  <ProjectItem project={project} />
                  <Divider className="m-0" />
                </React.Fragment>
              ),
            )}

            <div className="w-full flex items-center justify-center py-10">
              <Pagination
                page={page}
                total={filteredSites.length}
                onPageChange={(page) => updatePage(page)}
                limit={pageSize}
              />
            </div>
          </NoContent>
        </div>
      </div>

      <CaptureRate
        setShowCaptureRate={setShowCaptureRate}
        showCaptureRate={showCaptureRate}
        projectId={activeProject?.id}
        isMobile={activeProject?.platform !== 'web'}
        open={showCaptureRate && !!activeProject}
      />
    </Loader>
  );
}

export default withPageTitle('Projects - OpenReplay Preferences')(
  observer(Sites),
);
