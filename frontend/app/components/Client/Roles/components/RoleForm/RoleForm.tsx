import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';



import { useStore } from 'App/mstore';
import { Button, Checkbox, Form, Icon, Input } from 'UI';



import Select from 'Shared/Select';



import stl from './roleForm.module.css';


interface Permission {
  name: string;
  value: string;
}

interface Props {
  closeModal: (toastMessage?: string) => void;
  permissionsMap: any;
  deleteHandler: (id: any) => Promise<void>;
}

const RoleForm = (props: Props) => {
  const { roleStore, projectsStore } = useStore();
  const projects = projectsStore.list;
  const role = roleStore.instance;
  const saving = roleStore.loading;
  const { closeModal, permissionsMap } = props;
  const projectOptions = projects
    .filter(({ value }) => !role.projects.includes(value))
    .map((p: any) => ({
      key: p.id,
      value: p.id,
      label: p.name,
    }))
    .filter(({ value }: any) => !role.projects.includes(value));
  const projectsMap = projects.reduce((acc: any, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  let focusElement = useRef<any>(null);
  const permissions: {}[] = roleStore.permissions
    .filter(({ value }) => !role.permissions.includes(value))
    .map((p) => ({
      label: p.text,
      value: p.value,
    }));
  const _save = () => {
    roleStore.saveRole(role).then(() => {
      closeModal(role.exists() ? 'Role updated' : 'Role created');
    });
  };

  const write = ({ target: { value, name } }: any) => roleStore.editRole({ [name]: value });

  const onChangePermissions = (e: any) => {
    const { permissions } = role;
    const index = permissions.indexOf(e);
    let _perms;
    if (permissions.includes(e)) {
      permissions.splice(index, 1);
      _perms = permissions;
    } else {
      _perms = permissions.concat(e);
    }
    roleStore.editRole({ permissions: _perms });
  };

  const onChangeProjects = (e: any) => {
    const { projects } = role;
    const index = projects.indexOf(e);
    let _projects;
    if (index === -1) {
      _projects = projects.concat(e)
    } else {
      projects.splice(index, 1)
      _projects = projects
    }
    roleStore.editRole({ projects: _projects });
  };

  const writeOption = ({ name, value }: any) => {
    if (name === 'permissions') {
      onChangePermissions(value);
    } else if (name === 'projects') {
      onChangeProjects(value);
    }
  };

  const toggleAllProjects = () => {
    const { allProjects } = role;
    roleStore.editRole({ allProjects: !allProjects });
  };

  useEffect(() => {
    focusElement && focusElement.current && focusElement.current.focus();
  }, []);

  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <h3 className="p-5 text-2xl">
        {role.exists() ? 'Edit Role' : 'Create Role'}
      </h3>
      <div className="px-5">
        <Form onSubmit={_save}>
          <Form.Field>
            <label>{'Title'}</label>
            <Input
              ref={focusElement}
              name="name"
              value={role.name}
              onChange={write}
              maxLength={40}
              className={stl.input}
              id="name-field"
              placeholder="Ex. Admin"
            />
          </Form.Field>

          <Form.Field>
            <label>{'Project Access'}</label>

            <div className="flex my-3">
              <Checkbox
                name="allProjects"
                className="font-medium mr-3"
                type="checkbox"
                checked={role.allProjects}
                onClick={toggleAllProjects}
                label={''}
              />
              <div
                className="cursor-pointer leading-none select-none"
                onClick={toggleAllProjects}
              >
                <div>All Projects</div>
                <span className="text-xs text-gray-600">
                  (Uncheck to select specific projects)
                </span>
              </div>
            </div>
            {!role.allProjects && (
              <>
                <Select
                  isSearchable
                  name="projects"
                  options={projectOptions}
                  onChange={({ value }: any) =>
                    writeOption({ name: 'projects', value: value.value })
                  }
                  value={null}
                />
                {role.projects.size > 0 && (
                  <div className="flex flex-row items-start flex-wrap mt-4">
                    {role.projects.map((p: any) =>
                      OptionLabel(projectsMap, p, onChangeProjects)
                    )}
                  </div>
                )}
              </>
            )}
          </Form.Field>

          <Form.Field>
            <label>{'Capability Access'}</label>
            <Select
              isSearchable
              name="permissions"
              options={permissions}
              onChange={({ value }: any) =>
                writeOption({ name: 'permissions', value: value.value })
              }
              value={null}
            />
            {role.permissions.length > 0 && (
              <div className="flex flex-row items-start flex-wrap mt-4">
                {role.permissions.map((p: any) =>
                  OptionLabel(permissionsMap, p, onChangePermissions)
                )}
              </div>
            )}
          </Form.Field>
        </Form>

        <div className="flex items-center">
          <div className="flex items-center mr-auto">
            <Button
              onClick={_save}
              disabled={!role.validate}
              loading={saving}
              variant="primary"
              className="float-left mr-2"
            >
              {role.exists() ? 'Update' : 'Add'}
            </Button>
            {role.exists() && <Button onClick={closeModal}>{'Cancel'}</Button>}
          </div>
          {role.exists() && (
            <Button variant="text" onClick={() => props.deleteHandler(role)}>
              <Icon name="trash" size="18" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default observer(RoleForm);

function OptionLabel(nameMap: any, p: any, onChangeOption: (e: any) => void) {
  return (
    <div
      className="px-2 py-1 rounded bg-gray-lightest mr-2 mb-2 border flex items-center justify-between"
      key={p.roleId}
    >
      <div>{nameMap[p]}</div>
      <div className="cursor-pointer ml-2" onClick={() => onChangeOption(p)}>
        <Icon name="close" size="12" />
      </div>
    </div>
  );
}
