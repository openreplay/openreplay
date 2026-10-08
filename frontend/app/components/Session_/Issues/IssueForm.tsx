import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { Input } from '@/ui/inputs/input';
import { SimpleSelect } from '@/ui/inputs/select';
import { Textarea } from '@/ui/inputs/textarea';
import { useToast } from '@/ui/overlays/toast';
import { LoaderCircle } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

interface Props {
  closeHandler: () => void;
  sessionId: string;
  errors: string[];
}

const IssueForm: React.FC<Props> = observer(
  ({ closeHandler, sessionId, errors }) => {
    const {
      issueReportingStore: {
        createLoading: creating,
        projects,
        projectsLoading,
        users,
        instance,
        metaLoading,
        issueTypes,
        saveIssue,
        init,
        editInstance: edit,
        fetchMeta,
        fetchList,
      },
    } = useStore();
    const { t } = useTranslation();
    const toast = useToast();

    useEffect(() => {
      init({
        projectId: projects[0]?.id || '',
        issueType: issueTypes[0]?.id || '',
      });
    }, []);

    useEffect(() => {
      if (instance?.projectId) {
        fetchMeta(instance.projectId).then(() => {
          edit({ issueType: '', assignee: '', projectId: instance.projectId });
        });
      }
    }, [instance?.projectId]);

    const onFinish = async () => {
      await saveIssue(sessionId, instance)
        .then(() => {
          closeHandler();
        })
        .catch(() => {
          toast.error(t('Failed to create issue'));
        });

      // if (!errors || errors.length === 0) {
      //   init({ projectId: instance?.projectId });
      //   fetchList(sessionId);
      //   closeHandler();
      // }
    };

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const { name, value } = e.target;
      edit({ [name]: value });
    };

    const handleSelect = (field: string) => (value: string) => {
      edit({ [field]: value });
    };

    const projectOptions = projects.map(
      ({ name, id }: { name: string; id: string }) => ({
        label: name,
        value: id,
      }),
    );
    const userOptions = users.map(
      ({ name, id }: { name: string; id: string }) => ({
        label: name,
        value: id,
      }),
    );
    const issueTypeOptions = issueTypes.map((opt: any) => ({
      label: opt.name,
      value: opt.id,
      iconUrl: opt.iconUrl,
    }));

    return (
      <Loader loading={projectsLoading} size={40}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onFinish();
          }}
        >
          <div className="m-dfield">
            <span className="m-dfield__label inline-flex items-center gap-2">
              {t('Project')}
              {metaLoading && (
                <LoaderCircle
                  role="status"
                  aria-label={t('Loading')}
                  size={14}
                  className="animate-spin text-content-muted"
                />
              )}
            </span>
            <SimpleSelect
              value={instance?.projectId || undefined}
              onChange={(v) => v && handleSelect('projectId')(v)}
              placeholder={t('Project')}
              ariaLabel={t('Project')}
              options={projectOptions}
            />
          </div>
          <div className="m-dfield">
            <span className="m-dfield__label">{t('Issue Type')}</span>
            <SimpleSelect
              value={instance?.issueType || undefined}
              onChange={(v) => v && handleSelect('issueType')(v)}
              placeholder={t('Select issue type')}
              ariaLabel={t('Issue Type')}
              options={issueTypeOptions.map((o: any) => ({
                value: String(o.value),
                label: (
                  <span className="inline-flex items-center gap-2">
                    {o.iconUrl}
                    {o.label}
                  </span>
                ),
              }))}
            />
          </div>
          <div className="m-dfield">
            <span className="m-dfield__label">{t('Assignee')}</span>
            <SimpleSelect
              value={instance?.assignee || undefined}
              onChange={(v) => v && handleSelect('assignee')(v)}
              placeholder={t('Select a user')}
              ariaLabel={t('Assignee')}
              options={userOptions}
            />
          </div>
          <label className="m-dfield">
            <span className="m-dfield__label">{t('Summary')}</span>
            <Input
              name="title"
              value={instance?.title}
              placeholder={t('Issue Title / Summary')}
              onChange={handleChange}
            />
          </label>
          <label className="m-dfield">
            <span className="m-dfield__label">{t('Description')}</span>
            <Textarea
              name="description"
              rows={3}
              value={instance?.description}
              placeholder={t('E.g. Found this issue at 3:29secs')}
              onChange={handleChange}
            />
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              loading={creating}
              disabled={!instance?.isValid}
              type="submit"
            >
              {t('Create')}
            </Button>
            <Button variant="subtle" onClick={closeHandler}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </Loader>
    );
  },
);

export default IssueForm;
