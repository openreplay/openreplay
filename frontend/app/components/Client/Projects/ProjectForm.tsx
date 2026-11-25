import { projectStore, useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { Button } from '@/ui/actions/button';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { useToast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose?: (arg: any) => void;
}

/** Name and type of a new project; creating one makes it the open project. */
function ProjectForm({ onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const mstore = useStore();
  const { projectsStore } = mstore;
  const [project, setProject] = React.useState<Project>(new Project({}));

  const submit = () => {
    if (!project.name?.trim()) return;
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
            {t('Add')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            onClick={() => onClose?.(null)}
          >
            {t('Cancel')}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default observer(ProjectForm);
