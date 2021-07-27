import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { IconButton, SlideModal, Input, Button, Loader, NoContent, Popup, CopyButton } from 'UI';
import { init, save, edit, remove as deleteMember, fetchList } from 'Duck/member';
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
}), {
  init,
  save,
  edit,
  deleteMember,
  fetchList
})
@withPageTitle('Manage Users - OpenReplay Preferences')
class ManageUsers extends React.PureComponent {
  state = { showModal: false, remaining: this.props.account.limits.teamMember.remaining, invited: false }

  onChange = (e, { name, value }) => this.props.edit({ [ name ]: value });
  onChangeCheckbox = ({ target: { checked, name } }) => this.props.edit({ [ name ]: checked });
  setFocus = () => this.focusElement.focus();
  closeModal = () => this.setState({ showModal: false });
  componentWillMount = () => {
    this.props.fetchList();
  }
  
  adminLabel = (user) => {
    if (user.superAdmin) return 'Owner';
    return user.admin ? 'Admin' : '';
  };

  editHandler = user => {
    this.init(user)
  }

  deleteHandler = async (user) => {
    if (await confirm({
      header: 'Manage Users',
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

  formContent = member => (
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

        <div className={cn("mb-4 p-2", styles.smtpMessage)}>
          SMTP is not configured, <a className="link" href="https://docs.openreplay.com/configuration/configure-smtp" target="_blank">setup SMTP</a>
        </div>

        <div className={ styles.formGroup }>
          <label className={ styles.checkbox }>
            <input
              name="admin"
              type="checkbox"
              value={ member.admin }
              checked={ !!member.admin }
              onChange={ this.onChangeCheckbox }
            />
            <span>{ 'Admin' }</span>
          </label>
          <div className={ styles.adminInfo }>{ 'Can manage Projects and team members.' }</div>
        </div>
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
        { true &&  
          <CopyButton
            content={"test"}
            className="link"        
            btnText="Copy invite link"
          />
        }
      </div>
    </div>
  )

  init = (v) => {
    this.props.init(v);
    this.setState({ showModal: true });
    this.setFocus();
  }

  render() {
    const {
      members, member, loading, account, hideHeader = false,
    } = this.props;
    const { showModal, remaining } = this.state;
    const isAdmin = account.admin || account.superAdmin;
    const canAddUsers = isAdmin && remaining !== 0;

    return (
      <React.Fragment>
        <Loader loading={ loading }>
          <SlideModal
            title="Inivte People"
            size="small"
            isDisplayed={ showModal }
            content={ this.formContent(member) }
            onClose={ this.closeModal }
          />
          <div className={ styles.wrapper }>
            <div className={ cn(styles.tabHeader, 'flex items-center') }>
              <div className="flex items-center mr-auto">
                { !hideHeader && <h3 className={ cn(styles.tabTitle, "text-2xl") }>{ (isAdmin ? 'Manage ' : '') + 'Users' }</h3> }
                { hideHeader && <h3 className={ cn(styles.tabTitle, "text-xl") }>{ `Team Size ${members.size}` }</h3>}
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
                  // disabled={ canAddUsers }
                  content={ `${ !canAddUsers ? (!isAdmin ? PERMISSION_WARNING : LIMIT_WARNING) : 'Add team member' }` }
                  size="tiny"
                  inverted
                  position="top left"
                />
              </div>
              <div>
                { !account.smtp && 
                <BannerMessage>
                  Inviting new users require email messaging. Please <a className="link" href="https://docs.openreplay.com/configuration/configure-smtp" target="_blank">setup SMTP</a>.
                </BannerMessage>
                }
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
