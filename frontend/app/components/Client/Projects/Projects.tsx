import { useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { SearchField } from '@/ui/inputs/SearchField';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Globe, Plus, Smartphone, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';
import CustomFields from 'Components/Client/CustomFields';
import PreferencesPage from 'Components/Client/PreferencesPage';
import CaptureLimit from 'Components/Client/Projects/CaptureLimit';
import ProjectCaptureRate from 'Components/Client/Projects/ProjectCaptureRate';
import ProjectForm from 'Components/Client/Projects/ProjectForm';
import ProjectTabTracking from 'Components/Client/Projects/ProjectTabTracking';
import { useModal } from 'Components/ModalContext';

import { PrefBlock, PrefField, SecretValue } from '../PrefSection';

type Tab = 'installation' | 'captureRate' | 'metadata';

function Projects() {
  const { t } = useTranslation();
  const toast = useToast();
  const { projectsStore, customFieldStore, userStore } = useStore();
  const history = useHistory();
  const { project, pid, tab } = projectsStore.config;
  const { openModal, closeModal } = useModal();
  const [query, setQuery] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const p = params.get('pid');
    projectsStore.setConfigProject(p ? parseInt(p, 10) : undefined);
    projectsStore.setConfigTab(params.get('tab'));
    // unknown limits leave the action enabled; the server still enforces them
    userStore.ensureLimits().catch(() => {});
    return () => {
      // the session filters and the player list the active project's metadata
      // keys: rebuild them (a global filter map reset) only if they were edited
      // here or another project's keys were loaded in their place
      const active = `${projectsStore.activeSiteId}`;
      const other = (v?: string) => v !== undefined && v !== active;
      const { changed, listFor, filtersFor } = customFieldStore;
      if (changed || other(listFor) || other(filtersFor))
        void customFieldStore.fetchListActive(active);
    };
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    if (pid) params.set('pid', `${pid}`);
    if (tab) params.set('tab', tab);
    // replace: switching tabs or projects here shouldn't stack history entries
    history.replace({ search: params.toString() });
  }, [pid, tab]);

  const q = query.trim().toLowerCase();
  const projects = projectsStore.list.filter(
    (p) => !q || p.name.toLowerCase().includes(q),
  );
  const current = (tab as Tab) || 'installation';
  const { isAdmin, limits, limitsLoaded } = userStore;
  const atLimit =
    limitsLoaded && limits.projects !== -1 && limits.projects <= 0;
  const addBlocked = !isAdmin
    ? t('You don’t have the permissions to perform this action.')
    : atLimit
      ? t('You have reached site limit.')
      : undefined;

  const addProject = () =>
    openModal(<ProjectForm onClose={closeModal} />, {
      title: t('Add project'),
    });

  const remove = () => {
    setDeleting(false);
    if (!project?.id) return;
    projectsStore
      .removeProject(project.id)
      .then(() => {
        toast.success(t('Project deleted'));
        userStore.fetchLimits().catch(() => {});
      })
      .catch((e: Error) =>
        toast.error(
          e.message || t('An error occurred while deleting the project'),
        ),
      );
  };

  return (
    <PreferencesPage title={t('Projects')} flush>
      <div className="m-pref__split">
        <div className="m-pref__split-rail">
          <div className="m-pref__rail-search">
            <SearchField
              placeholder={t('Search projects')}
              value={query}
              onChange={setQuery}
            />
          </div>
          {projects.map((p) => (
            <Tooltip
              key={p.projectId}
              title={t('{{n}}% capture rate', { n: p.sampleRate })}
              side="right"
              delay={400}
            >
              <button
                type="button"
                className={`m-pref__proj m-hover${p.projectId === pid ? ' is-active' : ''}`}
                onClick={() =>
                  projectsStore.setConfigProject(p.projectId ?? undefined)
                }
              >
                <span className="m-pref__proj-icon">
                  {p.platform === 'web' ? (
                    <Globe size={14} />
                  ) : (
                    <Smartphone size={14} />
                  )}
                </span>
                <span className="m-pref__proj-name m-truncate">{p.name}</span>
              </button>
            </Tooltip>
          ))}
          <Blocked reason={addBlocked}>
            <Button
              variant="subtle"
              size="sm"
              disabled={!!addBlocked}
              onClick={addProject}
              className="justify-start"
            >
              <Plus size={14} />
              {t('Add project')}
            </Button>
          </Blocked>
        </div>

        <div className="m-pref__split-body">
          {project ? (
            <>
              <PrefBlock flush>
                <div className="m-pref__row m-pref__tabrow">
                  <Tabs
                    value={current}
                    onValueChange={(v) => projectsStore.setConfigTab(v)}
                  >
                    <TabsList
                      aria-label={t('Project settings')}
                      className="border-b-0"
                    >
                      <TabsTrigger value="installation">
                        {t('Installation')}
                      </TabsTrigger>
                      <TabsTrigger value="captureRate">
                        {t('Capture rate')}
                      </TabsTrigger>
                      <TabsTrigger value="metadata">
                        {t('Metadata')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <span
                    className="m-pref__scope"
                    style={{ marginLeft: 'auto' }}
                  >
                    {project.platform === 'web' ? t('Web') : t('Mobile')}
                  </span>
                  <IconButton
                    icon={<Trash2 size={14} />}
                    label={t('Delete {{name}}', { name: project.name })}
                    variant="ghost"
                    disabled={
                      !userStore.isAdmin || projectsStore.list.length < 2
                    }
                    onClick={() => setDeleting(true)}
                  />
                </div>
              </PrefBlock>
              {current === 'installation' ? (
                <>
                  <ThisProject key={project.projectId} project={project} />
                  <PrefBlock
                    title={t('Project key')}
                    hint={t(
                      'The one value the tracker needs. It is not a secret - it ships in your page.',
                    )}
                  >
                    <PrefField>
                      <SecretValue
                        value={project.projectKey ?? ''}
                        secret={false}
                        label={t('project key')}
                      />
                    </PrefField>
                  </PrefBlock>
                  <PrefBlock
                    title={t('Install the tracker')}
                    hint={t('The steps, in order.')}
                  >
                    <ProjectTabTracking project={project} />
                  </PrefBlock>
                </>
              ) : current === 'captureRate' ? (
                <>
                  <ProjectCaptureRate project={project} />
                  <CaptureLimit project={project} />
                </>
              ) : (
                <PrefBlock flush>
                  <CustomFields />
                </PrefBlock>
              )}
            </>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={deleting}
        title={t('Delete {{name}}?', { name: project?.name ?? '' })}
        okText={t('Delete project')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={remove}
      >
        {t(
          'Every session, dashboard and alert belonging to this project goes with it. This cannot be undone.',
        )}
      </ConfirmDialog>
    </PreferencesPage>
  );
}

function Blocked({
  reason,
  children,
}: {
  reason?: string;
  children: React.ReactElement;
}) {
  if (!reason) return children;
  return (
    <Tooltip title={reason}>
      <span className="inline-flex">{children}</span>
    </Tooltip>
  );
}

const ThisProject = observer(({ project }: { project: Project }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { projectsStore, userStore } = useStore();
  const [name, setName] = React.useState(project.name);
  const [platform, setPlatform] = React.useState(project.platform);
  const dirty = name.trim() !== project.name || platform !== project.platform;

  const save = () =>
    projectsStore
      .updateProject(project.id!, { name: name.trim(), platform })
      .then(() => toast.success(t('Project updated successfully')))
      .catch((e: Error) =>
        toast.error(
          e.message || t('An error occurred while updating the project'),
        ),
      );

  return (
    <PrefBlock
      title={t('This project')}
      hint={t(
        'The name is yours and changes nothing; the key never changes at all.',
      )}
    >
      <PrefField label={t('Project name')}>
        <Input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </PrefField>
      <PrefField
        label={t('Project type')}
        note={t(
          'It decides which tracker you install. Changing it changes the steps below.',
        )}
      >
        <Segmented<string>
          value={platform}
          onChange={setPlatform}
          ariaLabel={t('Project type')}
          options={[
            { value: 'web', label: t('Web') },
            { value: 'ios', label: t('Mobile') },
          ]}
        />
      </PrefField>
      <div className="m-pref__row">
        <Blocked
          reason={
            userStore.isAdmin
              ? undefined
              : t('You don’t have the permissions to perform this action.')
          }
        >
          <Button
            variant="primary"
            disabled={
              !userStore.isAdmin ||
              !dirty ||
              !name.trim() ||
              projectsStore.loading
            }
            onClick={() => void save()}
          >
            {t('Save')}
          </Button>
        </Blocked>
      </div>
    </PrefBlock>
  );
});

export default observer(Projects);
