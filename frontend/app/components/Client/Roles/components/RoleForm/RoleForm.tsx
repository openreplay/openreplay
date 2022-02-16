import React, { useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import stl from './roleForm.css'
import { save, edit } from 'Duck/roles'
import { Input, Button, Checkbox, Dropdown, Icon } from 'UI'

interface Permission {
  name: string,
  value: string
}

interface Props {
  role: any,
  edit: (role: any) => void,
  save: (role: any) => Promise<void>,
  closeModal: (toastMessage?: string) => void,
  saving: boolean,
  permissions: Array<Permission>[]
  projectOptions: Array<any>[],
  permissionsMap: any,
  projectsMap: any,
  deleteHandler: (id: any) => Promise<void>,
}

const RoleForm = (props: Props) => {
  const { role, edit, save, closeModal, saving, permissions, projectOptions, permissionsMap, projectsMap } = props
  let focusElement = useRef<any>(null)
  const _save = () => {
    save(role).then(() => {
      closeModal(role.exists() ? "Role updated" : "Role created");
    })
  }

  const write = ({ target: { value, name } }) => edit({ [ name ]: value })

  const onChangePermissions = (e) => {
    const { permissions } = role
    const index = permissions.indexOf(e)
    const _perms = permissions.contains(e) ? permissions.remove(index) : permissions.push(e)
    edit({ permissions: _perms })
  }

  const onChangeProjects = (e) => {
    const { projects } = role
    const index = projects.indexOf(e)
    const _projects = index === -1 ? projects.push(e) : projects.remove(index)
    edit({ projects: _projects })
  }

  const writeOption = (e, { name, value }) => {
    if (name === 'permissions') {
      onChangePermissions(value)
    } else if (name === 'projects') {
      onChangeProjects(value)
    }
  }

  const toggleAllProjects = () => {
    const { allProjects } = role
    edit({ allProjects: !allProjects })
  }

  useEffect(() => {
    focusElement && focusElement.current && focusElement.current.focus()
  }, [])

  return (
    <div className={ stl.form }>
      <form onSubmit={ _save } >
        <div className="form-group">
          <label>{ 'Title' }</label>
          <Input
            ref={ focusElement }
            name="name"
            value={ role.name }
            onChange={ write }
            className={ stl.input }
            id="name-field"
            placeholder="Ex. Admin"
          />
        </div>

        <div className="form-group flex flex-col">
          <label>{ 'Project Access' }</label>

          <div className="flex my-3">
            <Checkbox
              name="allProjects"
              className="font-medium"
              type="checkbox"
              checked={ role.allProjects }
              onClick={toggleAllProjects}
              label={''}
            />
            <div className="cursor-pointer" onClick={toggleAllProjects}>
              <div>All Projects</div>
              <span className="text-xs text-gray-600">
                (Uncheck to select specific projects)
              </span>
            </div>
          </div>
          { !role.allProjects && (
            <>
              <Dropdown
                search
                className="fluid"
                placeholder="Select"
                selection
                options={ projectOptions }
                name="projects"
                value={null}
                onChange={ writeOption }
                id="change-dropdown"
                selectOnBlur={false}
                selectOnNavigation={false}
              />
              { role.projects.size > 0 && (
                <div className="flex flex-row items-start flex-wrap mt-4">
                  { role.projects.map(p => (
                    OptionLabel(projectsMap, p, onChangeProjects)
                  )) }
                </div>
              )}
            </>
          )}
        </div>

        <div className="form-group flex flex-col">
          <label>{ 'Capability Access' }</label>
          <Dropdown
            search
            className="fluid"
            placeholder="Select"
            selection
            options={ permissions }
            name="permissions"
            value={null}
            onChange={ writeOption }
            id="change-dropdown"
            selectOnBlur={false}
            selectOnNavigation={false}
          />
          { role.permissions.size > 0 && (
            <div className="flex flex-row items-start flex-wrap mt-4">
              { role.permissions.map(p => (
                OptionLabel(permissionsMap, p, onChangePermissions)
              )) }
            </div>
          )}
        </div>
      </form>

      <div className="flex items-center">
        <div className="flex items-center mr-auto">
          <Button
            onClick={ _save }
            disabled={ !role.validate() }
            loading={ saving }
            primary
            marginRight
          >
            { role.exists() ? 'Update' : 'Add' }
          </Button>
          <Button
            data-hidden={ !role.exists() }
            onClick={ closeModal }
            outline
          >
            { 'Cancel' }
          </Button>
        </div>
        { role.exists() && (
          <div>
            <Button
              data-hidden={ !role.exists() }
              onClick={ () => props.deleteHandler(role) }
              hover
              noPadding
            >
              <Icon name="trash" size="18"/>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default connect(state => {
  const role = state.getIn(['roles', 'instance'])
  const projects = state.getIn([ 'site', 'list' ])
  return {
    role,
    projectOptions: projects.map(p => ({
      key: p.get('id'),
      value: p.get('id'),
      text: p.get('name'),
      disabled: role.projects.includes(p.get('id')),
    })).toJS(),
    permissions: state.getIn(['roles', 'permissions'])
      .map(({ text, value }) => ({ text, value, disabled: role.permissions.includes(value) })).toJS(),
    saving: state.getIn([ 'roles', 'saveRequest', 'loading' ]),
    projectsMap: projects.reduce((acc, p) => {
      acc[ p.get('id') ] = p.get('name')
      return acc
    }
    , {}),
  }
}, { edit, save })(RoleForm);

function OptionLabel(nameMap: any, p: any, onChangeOption: (e: any) => void) {
  return <div className="px-2 py-1 rounded bg-gray-lightest mr-2 mb-2 border flex items-center justify-between">
    <div>{nameMap[p]}</div>
    <div className="cursor-pointer ml-2" onClick={() => onChangeOption(p)}>
      <Icon name="close" size="12" />
    </div>
  </div>
}
