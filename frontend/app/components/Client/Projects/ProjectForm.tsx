import React, { ChangeEvent, FormEvent, useEffect } from 'react';
import styles from 'Components/Client/Sites/siteForm.module.css';
import { Icon } from 'UI';
import Project from '@/mstore/types/project';
import { projectStore, useStore } from '@/mstore';
import { Modal, Segmented, Form, Input, Button } from 'antd';
import { toast } from 'react-toastify';
import { observer } from 'mobx-react-lite';

interface Props {
  project?: Project;
  onClose?: (arg: any) => void;
}

function ProjectForm(props: Props) {
  const { onClose } = props;
  const { projectsStore } = useStore();
  const project = projectsStore.instance as Project;
  const loading = projectsStore.loading;
  const canDelete = projectsStore.list.length > 1;
  const pathname = window.location.pathname;

  useEffect(() => {
    if (props.project && props.project.id) {
      projectsStore.initProject(props.project);
    } else {
      projectsStore.initProject({});
    }
  }, []);

  const handleEdit = ({ target: { name, value } }: ChangeEvent<HTMLInputElement>) => {
    projectsStore.editInstance({ [name]: value });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!projectsStore.instance) return;
    if (projectsStore.instance.id && projectsStore.instance.exists()) {
      projectsStore
        .updateProject(projectsStore.instance.id, project)
        .then((response: any) => {
          if (!response || !response.errors || response.errors.size === 0) {
            if (onClose) {
              onClose(null);
            }
            if (!pathname.includes('onboarding')) {
              void projectsStore.fetchList();
            }
            toast.success('Project updated successfully');
          } else {
            toast.error(response.errors[0]);
          }
        });
    } else {
      projectsStore.save(projectsStore.instance!).then((response: any) => {
        if (!response || !response.errors || response.errors.size === 0) {
          if (onClose) {
            onClose(null);
          }
          // searchStore.clearSearch();
          // mstore.searchStoreLive.clearSearch();
          // mstore.initClient();
          toast.success('Project added successfully');
        } else {
          toast.error(response.errors[0]);
        }
      });
    }
  };

  const handleRemove = async () => {
    Modal.confirm({
      title: 'Project Deletion Alert',
      content: 'Are you sure you want to delete this project? Deleting it will permanently remove the project, along with all associated sessions and data.',
      onOk: () => {
        projectsStore.removeProject(project.id!).then(() => {
          if (onClose) {
            onClose(null);
          }
          if (project.id === projectsStore.active?.id) {
            projectsStore.setSiteId(projectStore.list[0].id!);
          }
        });
      }
    });
  };

  return (
    <Form onFinish={project.validate ? onSubmit : () => null}>
      <div className={styles.content}>
        <Form.Item>
          <label>{'Name'}</label>
          <Input
            placeholder="Ex. OpenReplay"
            name="name"
            maxLength={40}
            value={project.name}
            onChange={handleEdit}
            className={styles.input}
          />
        </Form.Item>
        <Form.Item>
          <label>Project Type</label>
          <div>
            <Segmented
              options={[
                {
                  value: 'web',
                  label: 'Web'
                },
                {
                  value: 'ios',
                  label: 'Mobile'
                }
              ]}
              value={project.platform}
              onChange={(value) => {
                projectsStore.editInstance({ platform: value });
              }}
            />
          </div>
        </Form.Item>
        <div className="mt-6 flex justify-between">
          <Button
            htmlType="submit"
            type="primary"
            className="float-left mr-2"
            loading={loading}
            disabled={!project.validate}
          >
            {project.exists() ? 'Update' : 'Add'}
          </Button>
          {project.exists() && (
            <Button
              variant="text"
              onClick={handleRemove}
              disabled={!canDelete}
            >
              <Icon name="trash" size="16" />
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}

export default observer(ProjectForm);
