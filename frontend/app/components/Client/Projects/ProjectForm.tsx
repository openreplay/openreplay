import { projectStore, useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  project?: Project;
  onClose?: (arg: any) => void;
}

/** Name and type of a project; creating one makes it the open project. */
function ProjectForm({ project: initial, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const mstore = useStore();
  const { projectsStore } = mstore;
  const [project, setProject] = React.useState<Project>(
    new Project(initial || {}),
  );
  const [deleting, setDeleting] = React.useState(false);
  const exists = !!project.id && project.exists();
  const canDelete = projectsStore.list.length > 1;

  const submit = () => {
    if (!project.name?.trim()) return;
    if (exists) {
      projectsStore
        .updateProject(project.id!, project)
        .then(() => {
          toast.success(t('Project updated successfully'));
          onClose?.(null);
        })
        .catch((e: Error) =>
          toast.error(
            e.message || t('An error occurred while updating the project'),
          ),
        );
      return;
    }
    projectsStore
      .save(project)
      .then((resp: Project) => {
        toast.success(t('Project created successfully'));
        mstore.userStore.fetchLimits().catch(() => {});
        onClose?.(resp);
        mstore.initClient();
        projectsStore.setConfigProject(parseInt(resp.id!, 10));
      })
      .catch((e: Error) =>
        toast.error(
          e.message || t('An error occurred while creating the project'),
        ),
      );
  };

  const remove = () => {
    setDeleting(false);
    projectsStore
      .removeProject(project.id!)
      .then(() => onClose?.(null))
      .catch((e: Error) =>
        toast.error(
          e.message || t('An error occurred while deleting the project'),
        ),
      );
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label={t('Name')}>
        <Input
          autoFocus
          placeholder={t('Ex. OpenReplay')}
          maxLength={40}
          value={project.name ?? ''}
          onChange={(e) =>
            setProject((prev) => new Project({ ...prev, name: e.target.value }))
          }
        />
      </Field>
      <Field label={t('Project type')}>
        <Segmented<string>
          value={project.platform}
          onChange={(platform) =>
            setProject((prev) => new Project({ ...prev, platform }))
          }
          ariaLabel={t('Project type')}
          className="self-start"
          options={[
            { value: 'web', label: t('Web') },
            { value: 'ios', label: t('Mobile') },
          ]}
        />
      </Field>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!project.name?.trim() || projectStore.loading}
          >
            {exists ? t('Save') : t('Add')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            onClick={() => onClose?.(null)}
          >
            {t('Cancel')}
          </Button>
        </div>
        {exists ? (
          <IconButton
            icon={<Trash2 size={14} />}
            label={t('Delete project')}
            variant="ghost"
            disabled={!canDelete}
            onClick={() => setDeleting(true)}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={deleting}
        title={t('Delete {{name}}?', { name: project.name })}
        okText={t('Delete project')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={remove}
      >
        {t(
          'Every session, dashboard and alert belonging to this project goes with it. This cannot be undone.',
        )}
      </ConfirmDialog>
    </form>
  );
}

export default observer(ProjectForm);
