import React, { useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import stl from './roleForm.css'
import { save, edit } from 'Duck/roles'
import { Input, Button, Checkbox } from 'UI'

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
}

const RoleForm = ({ role, closeModal, edit, save, saving, permissions }: Props) => {
  let focusElement = useRef<any>(null)
  const _save = () => {
    save(role).then(() => {
      closeModal(role.exists() ? "Role updated" : "Role created");
    })
  }

  const write = ({ target: { value, name } }) => edit({ [ name ]: value })

  const onChangeOption = (e) => {
    const { permissions } = role
    const index = permissions.indexOf(e)
    const _perms = permissions.contains(e) ? permissions.remove(index) : permissions.push(e)
    edit({ permissions: _perms })
  }

  useEffect(() => {
    focusElement && focusElement.current && focusElement.current.focus()
  }, [])

  return (
    <div className={ stl.form }>
      <form onSubmit={ _save } >
        <div className={ stl.formGroup }>
          <label>{ 'Name' }</label>
          <Input
            ref={ focusElement }
            name="name"
            value={ role.name }
            onChange={ write }
            className={ stl.input }
            id="name-field"
          />
        </div>

        <div>
          { permissions.map((permission: any, index) => (
            <div key={ index } className={ stl.formGroup }>
              <Checkbox
                name="permissions"
                className="font-medium"
                type="checkbox"
                checked={ role.permissions.contains(permission.value) }
                onClick={ () => onChangeOption(permission.value) }
                label={permission.name}
              />
            </div>
          ))}
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
      </div>
    </div>
  );
}

export default connect(state => ({
  role: state.getIn(['roles', 'instance']),
  permissions: state.getIn(['roles', 'permissions']),
  saving: state.getIn([ 'roles', 'saveRequest', 'loading' ]),
}), { edit, save })(RoleForm);