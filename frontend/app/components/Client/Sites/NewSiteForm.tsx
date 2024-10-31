import { Segmented } from 'antd';
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { Button, Form, Icon, Input } from 'UI';
import { confirm } from 'UI';
import { observer } from 'mobx-react-lite';

import styles from './siteForm.module.css';

type OwnProps = {
  onClose: (arg: any) => void;
};

type Props = RouteComponentProps & OwnProps;

const NewSiteForm = ({ location: { pathname }, onClose }: Props) => {
  const mstore = useStore();
  const { projectsStore } = mstore;
  const activeSiteId = projectsStore.active?.id;
  const site = projectsStore.instance;
  const siteList = projectsStore.list;
  const loading = projectsStore.loading;
  const canDelete = siteList.length > 1;
  const setSiteId = projectsStore.setSiteId;
  const saveProject = projectsStore.save;
  const fetchList = projectsStore.fetchList;
  const [existsError, setExistsError] = useState(false);
  const { searchStore } = useStore();

  useEffect(() => {
    if (pathname.includes('onboarding') && site?.id) {
      setSiteId(site.id);
    }
    if (!site) projectsStore.initProject({});
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!projectsStore.instance) return;
    if (projectsStore.instance.id && projectsStore.instance.exists()) {
      projectsStore
        .updateProject(projectsStore.instance.id, projectsStore.instance.toData())
        .then((response: any) => {
          if (!response || !response.errors || response.errors.size === 0) {
            onClose(null);
            if (!pathname.includes('onboarding')) {
              void fetchList();
            }
            toast.success('Project updated successfully');
          } else {
            toast.error(response.errors[0]);
          }
        });
    } else {
      saveProject(projectsStore.instance!).then((response: any) => {
        if (!response || !response.errors || response.errors.size === 0) {
          onClose(null);
          searchStore.clearSearch();
          mstore.searchStoreLive.clearSearch();
          mstore.initClient();
          toast.success('Project added successfully');
        } else {
          toast.error(response.errors[0]);
        }
      });
    }
  };

  const handleRemove = async () => {
    if (
      (await confirm({
        header: 'Project Deletion Alert',
        confirmation: `Are you sure you want to delete this project? Deleting it will permanently remove the project, along with all associated sessions and data.`,
        confirmButton: 'Yes, delete',
        cancelButton: 'Cancel',
      })) &&
      site?.id
    ) {
      projectsStore.removeProject(site.id).then(() => {
        onClose(null);
        if (site.id === activeSiteId) {
          setSiteId(null);
        }
      });
    }
  };

  const handleEdit = ({
    target: { name, value },
  }: ChangeEvent<HTMLInputElement>) => {
    setExistsError(false);
    projectsStore.editInstance({ [name]: value });
  };

  if (!site) {
    return null;
  }
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <h3 className="p-5 text-2xl">
        {site.exists() ? 'Edit Project' : 'New Project'}
      </h3>
      <Form className={styles.formWrapper} onSubmit={site.validate && onSubmit}>
        <div className={styles.content}>
          <Form.Field>
            <label>{'Name'}</label>
            <Input
              placeholder="Ex. openreplay"
              name="name"
              maxLength={40}
              value={site.name}
              onChange={handleEdit}
              className={styles.input}
            />
          </Form.Field>
          <Form.Field>
            <label>Project Type</label>
            <div>
              <Segmented
                options={[
                  {
                    value: 'web',
                    label: 'Web',
                  },
                  {
                    value: 'ios',
                    label: 'Mobile',
                  },
                ]}
                value={site.platform}
                onChange={(value) => {
                  projectsStore.editInstance({ platform: value });
                }}
              />
            </div>
          </Form.Field>
          <div className="mt-6 flex justify-between">
            <Button
              variant="primary"
              type="submit"
              className="float-left mr-2"
              loading={loading}
              disabled={!site.validate}
            >
              {site?.exists() ? 'Update' : 'Add'}
            </Button>
            {site.exists() && (
              <Button
                variant="text"
                type="button"
                onClick={handleRemove}
                disabled={!canDelete}
              >
                <Icon name="trash" size="16" />
              </Button>
            )}
          </div>
          {existsError && (
            <div className={styles.errorMessage}>
              {'Project exists already.'}
            </div>
          )}
        </div>
      </Form>
    </div>
  );
};

export default withRouter(observer(NewSiteForm));
