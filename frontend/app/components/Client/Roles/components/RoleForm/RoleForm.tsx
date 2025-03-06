import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';

import { useStore } from 'App/mstore';
import { Checkbox, Form, Icon, Input } from 'UI';

import { Select, Button } from 'antd';
import { SelectProps } from 'antd/es/select';
import stl from './roleForm.module.css';
import { useTranslation } from 'react-i18next';

interface Props {
  closeModal: (toastMessage?: string) => void;
  permissionsMap: any;
  deleteHandler: (id: any) => Promise<void>;
}

function RoleForm(props: Props) {
  const { t } = useTranslation();
  const { roleStore, projectsStore } = useStore();
  const projects = projectsStore.list;
  const role = roleStore.instance;
  const saving = roleStore.loading;
  const { closeModal, permissionsMap } = props;

  const projectOptions: SelectProps['options'] = projects.map((p: any) => ({
    value: p.projectId,
    label: p.name,
  }));

  const permissionOptions: SelectProps['options'] = roleStore.permissions.map(
    (p: any) => ({
      value: p.value,
      label: p.text,
    }),
  );

  const selectProjects = (pros: { value: number; label: string }[]) => {
    const ids: any = pros.map((p) => p.value);
    roleStore.editRole({ projects: ids });
  };

  const selectPermissions = (pros: { value: number; label: string }[]) => {
    const ids: any = pros.map((p) => p.value);
    roleStore.editRole({ permissions: ids });
  };

  const focusElement = useRef<any>(null);
  // const permissions: {}[] = roleStore.permissions
  //   .filter(({ value }) => !role.permissions.includes(value))
  //   .map((p) => ({
  //     label: p.text,
  //     value: p.value
  //   }));

  const _save = () => {
    roleStore.saveRole(role).then(() => {
      closeModal(role.exists() ? t('Role updated') : t('Role created'));
    });
  };

  const write = ({ target: { value, name } }: any) =>
    roleStore.editRole({ [name]: value });

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
      _projects = projects.concat(e);
    } else {
      projects.splice(index, 1);
      _projects = projects;
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
            <label>{t('Title')}</label>
            <Input
              ref={focusElement}
              name="name"
              value={role.name}
              onChange={write}
              maxLength={40}
              className={stl.input}
              id="name-field"
              placeholder={t('Ex. Admin')}
            />
          </Form.Field>

          <Form.Field>
            <label>{t('Project Access')}</label>

            <div className="flex my-3">
              <Checkbox
                name="allProjects"
                className="font-medium mr-3"
                type="checkbox"
                checked={role.allProjects}
                onClick={toggleAllProjects}
                label=""
              />
              <div
                className="cursor-pointer leading-none select-none"
                onClick={toggleAllProjects}
              >
                <div>{t('All Projects')}</div>
                <span className="text-xs text-gray-600">
                  ({t('Uncheck to select specific projects')})
                </span>
              </div>
            </div>
            {!role.allProjects && (
              <Select
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                mode="multiple"
                allowClear
                placeholder={t('Select')}
                options={projectOptions.filter(
                  (option: any) => !role.projects.includes(option.value), // Exclude selected options
                )}
                onChange={selectProjects}
                labelInValue
                value={role.projects.map((projectId: string) => {
                  const matchingProject = projectOptions.find(
                    (opt) => opt.value === projectId,
                  );
                  return matchingProject
                    ? {
                        value: matchingProject.value,
                        label: matchingProject.label,
                      }
                    : { value: projectId, label: String(projectId) }; // Fallback to projectId as label
                })}
              />
            )}
          </Form.Field>

          <Form.Field>
            <label>{t('Capability Access')}</label>
            <Select
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              mode="multiple"
              allowClear
              placeholder={t('Select')}
              options={permissionOptions.filter(
                (option: any) => !role.permissions.includes(option.value), // Exclude selected options
              )}
              onChange={selectPermissions}
              labelInValue
              value={role.permissions.map((id: string) => {
                const matching = permissionOptions.find(
                  (opt) => opt.value === id,
                );
                return matching
                  ? { value: matching.value, label: matching.label }
                  : { value: id, label: String(id) }; // Fallback to projectId as label
              })}
            />

            {/* <Select */}
            {/*  isSearchable */}
            {/*  name="permissions" */}
            {/*  options={permissions} */}
            {/*  onChange={({ value }: any) => */}
            {/*    writeOption({ name: 'permissions', value: value.value }) */}
            {/*  } */}
            {/*  value={null} */}
            {/* /> */}
            {/* {role.permissions.length > 0 && ( */}
            {/*  <div className="flex flex-row items-start flex-wrap mt-4"> */}
            {/*    {role.permissions.map((p: any) => */}
            {/*      OptionLabel(permissionsMap, p, onChangePermissions) */}
            {/*    )} */}
            {/*  </div> */}
            {/* )} */}
          </Form.Field>
        </Form>

        <div className="flex items-center">
          <div className="flex items-center mr-auto">
            <Button
              onClick={_save}
              disabled={!role.validate}
              loading={saving}
              type="primary"
              className="float-left mr-2"
            >
              {role.exists() ? 'Update' : 'Add'}
            </Button>
            {role.exists() && (
              <Button onClick={closeModal}>{t('Cancel')}</Button>
            )}
          </div>
          {role.exists() && (
            <Button type="text" onClick={() => props.deleteHandler(role)}>
              <Icon name="trash" size="18" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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
