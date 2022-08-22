import React, { useRef, useEffect } from 'react';
import { connect } from 'react-redux';
import stl from './roleForm.module.css';
import { save, edit } from 'Duck/roles';
import { Form, Input, Button, Checkbox, Icon } from 'UI';
import Select from 'Shared/Select';

interface Permission {
    name: string;
    value: string;
}

interface Props {
    role: any;
    edit: (role: any) => void;
    save: (role: any) => Promise<void>;
    closeModal: (toastMessage?: string) => void;
    saving: boolean;
    permissions: Array<Permission>[];
    projectOptions: Array<any>[];
    permissionsMap: any;
    projectsMap: any;
    deleteHandler: (id: any) => Promise<void>;
}

const RoleForm = (props: Props) => {
    const { role, edit, save, closeModal, saving, permissions, projectOptions, permissionsMap, projectsMap } = props;
    let focusElement = useRef<any>(null);
    const _save = () => {
        save(role).then(() => {
            closeModal(role.exists() ? 'Role updated' : 'Role created');
        });
    };

    const write = ({ target: { value, name } }) => edit({ [name]: value });

    const onChangePermissions = (e) => {
        const { permissions } = role;
        const index = permissions.indexOf(e);
        const _perms = permissions.contains(e) ? permissions.remove(index) : permissions.push(e);
        edit({ permissions: _perms });
    };

    const onChangeProjects = (e) => {
        const { projects } = role;
        const index = projects.indexOf(e);
        const _projects = index === -1 ? projects.push(e) : projects.remove(index);
        edit({ projects: _projects });
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
        edit({ allProjects: !allProjects });
    };

    useEffect(() => {
        focusElement && focusElement.current && focusElement.current.focus();
    }, []);

    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
            <h3 className="p-5 text-2xl">{role.exists() ? 'Edit Role' : 'Create Role'}</h3>
            <div className="px-5">
                <Form onSubmit={_save}>
                    <Form.Field>
                        <label>{'Title'}</label>
                        <Input
                            ref={focusElement}
                            name="name"
                            value={role.name}
                            onChange={write}
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
                            <div className="cursor-pointer leading-none select-none" onClick={toggleAllProjects}>
                                <div>All Projects</div>
                                <span className="text-xs text-gray-600">(Uncheck to select specific projects)</span>
                            </div>
                        </div>
                        {!role.allProjects && (
                            <>
                                <Select
                                    isSearchable
                                    name="projects"
                                    options={projectOptions}
                                    onChange={({ value }: any) => writeOption({ name: 'projects', value: value.value })}
                                    value={null}
                                />
                                {role.projects.size > 0 && (
                                    <div className="flex flex-row items-start flex-wrap mt-4">
                                        {role.projects.map((p) => OptionLabel(projectsMap, p, onChangeProjects))}
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
                            onChange={({ value }: any) => writeOption({ name: 'permissions', value: value.value })}
                            value={null}
                        />
                        {role.permissions.size > 0 && (
                            <div className="flex flex-row items-start flex-wrap mt-4">
                                {role.permissions.map((p) => OptionLabel(permissionsMap, p, onChangePermissions))}
                            </div>
                        )}
                    </Form.Field>
                </Form>

                <div className="flex items-center">
                    <div className="flex items-center mr-auto">
                        <Button onClick={_save} disabled={!role.validate()} loading={saving} variant="primary" className="float-left mr-2">
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

export default connect(
    (state: any) => {
        const role = state.getIn(['roles', 'instance']);
        const projects = state.getIn(['site', 'list']);
        return {
            role,
            projectOptions: projects
                .map((p: any) => ({
                    key: p.get('id'),
                    value: p.get('id'),
                    label: p.get('name'),
                    // isDisabled: role.projects.includes(p.get('id')),
                }))
                .filter(({ value }: any) => !role.projects.includes(value))
                .toJS(),
            permissions: state
                .getIn(['roles', 'permissions'])
                .filter(({ value }: any) => !role.permissions.includes(value))
                .map(({ text, value }: any) => ({ label: text, value }))
                .toJS(),
            saving: state.getIn(['roles', 'saveRequest', 'loading']),
            projectsMap: projects.reduce((acc: any, p: any) => {
                acc[p.get('id')] = p.get('name');
                return acc;
            }, {}),
        };
    },
    { edit, save }
)(RoleForm);

function OptionLabel(nameMap: any, p: any, onChangeOption: (e: any) => void) {
    return (
        <div className="px-2 py-1 rounded bg-gray-lightest mr-2 mb-2 border flex items-center justify-between">
            <div>{nameMap[p]}</div>
            <div className="cursor-pointer ml-2" onClick={() => onChangeOption(p)}>
                <Icon name="close" size="12" />
            </div>
        </div>
    );
}
