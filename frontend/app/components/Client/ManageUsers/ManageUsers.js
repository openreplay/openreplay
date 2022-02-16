import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { 
  IconButton, SlideModal, Input, Button, Loader,
  NoContent, Popup, CopyButton, Dropdown } from 'UI';
import { init, save, edit, remove as deleteMember, fetchList, generateInviteLink } from 'Duck/member';
import { fetchList as fetchRoles } from 'Duck/roles';
import styles from './manageUsers.css';
import UserItem from './UserItem';
import { confirm } from 'UI/Confirmation';
import { toast } from 'react-toastify';
import BannerMessage from 'Shared/BannerMessage';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached users limit.';

@connect(state => ({
  account: state.getIn([ 'user', 'account' ]),
  members: state.getIn([ 'members', 'list' ]).filter(u => u.id),
  member: state.getIn([ 'members', 'instance' ]),
  errors: state.getIn([ 'members', 'saveRequest', 'errors' ]),
  loading: state.getIn([ 'members', 'loading' ]),
  saving: state.getIn([ 'members', 'saveRequest', 'loading' ]),
  roles: state.getIn(['roles', 'list']).filter(r => !r.protected).map(r => ({ text: r.name, value: r.roleId })).toJS(),
  isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}), {
  init,
  save,
  edit,
  deleteMember,
  fetchList,
  generateInviteLink,
  fetchRoles
})
@withPageTitle('Team - OpenReplay Preferences')
class ManageUsers extends React.PureComponent {
  state = { showModal: false, remaining: this.props.account.limits.teamMember.remaining, invited: false }

  // writeOption = (e, { name, value }) => this.props.edit({ [ name ]: value });
  onChange = (e, { name, value }) => this.props.edit({ [ name ]: value });
  onChangeCheckbox = ({ target: { checked, name } }) => this.props.edit({ [ name ]: checked });
  setFocus = () => this.focusElement && this.focusElement.focus();
  closeModal = () => this.setState({ showModal: false });
  componentWillMount = () => {
    this.props.fetchList();
    if (this.props.isEnterprise) {
      this.props.fetchRoles();
    }
  }
  
  adminLabel = (user) => {
    if (user.superAdmin) return null;
    return user.admin ? 'Admin' : '';
  };

  editHandler = user => {
    this.init(user)
  }

  deleteHandler = async (user) => {
    if (await confirm({
      header: 'Users',
      confirmation: `Are you sure you want to remove this user?`
    })) {
      this.props.deleteMember(user.id).then(() => {
        const { remaining } = this.state;
        if (remaining <= 0) return;
        this.setState({ remaining: remaining - 1 })
      });
    }
  }

  save = (e) => {
    e.preventDefault();
    this.props.save(this.props.member)
      .then(() => {
        const { errors } = this.props;
        if (errors && errors.size > 0) {
          errors.forEach(e => {
            toast.error(e);
          })
        }
        this.setState({ invited: true })
        // this.closeModal()
      });
  }
  
  formContent = () => {
    const { member, account, isEnterprise, roles } = this.props;

    return (
      <div className={ styles.form }>
        <form onSubmit={ this.save } >
          <div className={ styles.formGroup }>
            <label>{ 'Full Name' }</label>
            <Input
              ref={ (ref) => { this.focusElement = ref; } }
              name="name"
              value={ member.name }
              onChange={ this.onChange }
              className={ styles.input }
              id="name-field"
            />
          </div>

          <div className={ styles.formGroup }>
            <label>{ 'Email Address' }</label>
            <Input
              disabled={member.exists()}
              name="email"
              value={ member.email }
              onChange={ this.onChange }
              className={ styles.input }
            />
          </div>
          { !account.smtp &&
            <div className={cn("mb-4 p-2", styles.smtpMessage)}>
              SMTP is not configured (see <a className="link" href="https://docs.openreplay.com/configuration/configure-smtp" target="_blank">here</a> how to set it up).  You can still add new users, but you’d have to manually copy then send them the invitation link.
            </div>
          }
          <div className={ styles.formGroup }>
            <label className={ styles.checkbox }>
              <input
                name="admin"
                type="checkbox"
                value={ member.admin }
                checked={ !!member.admin }
                onChange={ this.onChangeCheckbox }
                disabled={member.superAdmin}
              />
              <span>{ 'Admin Privileges' }</span>
            </label>
            <div className={ styles.adminInfo }>{ 'Can manage Projects and team members.' }</div>
          </div>
          
          { isEnterprise && (
            <div className={ styles.formGroup }>
              <label htmlFor="role">{ 'Role' }</label>
              <Dropdown
                placeholder="Role"
                selection
                options={ roles }
                name="roleId"
                value={ member.roleId }
                onChange={ this.onChange }
              />
            </div>
          )}
        </form>

        <div className="flex items-center">
          <div className="flex items-center mr-auto">
            <Button
              onClick={ this.save }    
              disabled={ !member.validate() }
              loading={ this.props.saving }
              primary
              marginRight
            >
              { member.exists() ? 'Update' : 'Invite' }
            </Button>
            <Button
              data-hidden={ !member.exists() }
              onClick={ this.closeModal }
              outline
            >
              { 'Cancel' }
            </Button>
          </div>
          { !member.joined && member.invitationLink &&
            <CopyButton
              content={member.invitationLink}
              className="link"
              btnText="Copy invite link"
            />
          }
        </div>
      </div>
    )
  }

  init = (v) => {
    const { roles } = this.props;
    this.props.init(v ? v : { roleId: roles[0] ? roles[0].value : null });
    this.setState({ showModal: true });
    setTimeout(this.setFocus, 100);
  }

  render() {
    const {
      members, loading, account, hideHeader = false
    } = this.props;
    const { showModal, remaining, invited } = this.state;
    const isAdmin = account.admin || account.superAdmin;
    const canAddUsers = isAdmin && remaining !== 0;

    return (
      <React.Fragment>
        <Loader loading={ loading }>
          <SlideModal
            title="Invite People"
            size="small"
            isDisplayed={ showModal }
            content={ showModal && this.formContent() }
            onClose={ this.closeModal }
          />
          <div className={ styles.wrapper }>
            <div className={ cn(styles.tabHeader, 'flex items-center') }>
              <div className="flex items-center mr-auto">
                { !hideHeader && <h3 className={ cn(styles.tabTitle, "text-2xl") }>{ (isAdmin ? 'Manage ' : '') + `Users (${members.size})` }</h3> }
                { hideHeader && <h3 className={ cn(styles.tabTitle, "text-xl") }>{ `Users (${members.size})` }</h3>}
                <Popup
                  trigger={
                    <div>
                      <IconButton
                          id="add-button"
                          disabled={ !canAddUsers }
                          circle
                          icon="plus"
                          outline
                          onClick={ () => this.init() }
                      />
                    </div>
                  }
                  disabled={ canAddUsers }
                  content={ `${ !canAddUsers ? (!isAdmin ? PERMISSION_WARNING : LIMIT_WARNING) : 'Add team member' }` }
                  size="tiny"
                  inverted
                  position="top left"
                />
              </div>              
            </div>

            <NoContent
              title="No users are available."              
              size="small"
              show={ members.size === 0 }
              icon
            >
              <div className={ styles.list }>
                {
                  members.map(user => (
                    <UserItem
                      generateInviteLink={this.props.generateInviteLink}
                      key={ user.id }
                      user={ user }
                      adminLabel={ this.adminLabel(user) }
                      deleteHandler={ isAdmin && account.email !== user.email
                        ? this.deleteHandler
                        : null
                      }
                      editHandler={ isAdmin ? this.editHandler : null }
                    />
                  ))
                }

                { !members.size > 0 &&
                  <div>{ 'No Data.' }</div>
                }
              </div>
            </NoContent>
          </div>
        </Loader>
      </React.Fragment>
    );
  }
}

export default ManageUsers;
