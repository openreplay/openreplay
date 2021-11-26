import { connect } from 'react-redux';
import { NoPermission } from 'UI';

export default (requiredPermissions, className) => BaseComponent => 
@connect((state, props) => ({
  permissions: state.getIn([ 'user', 'account', 'permissions' ]),
  isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}))
class extends React.PureComponent {
  render() {
    const hasPermission = this.props.permissions.some(permission => requiredPermissions.includes(permission));

    return !this.props.isEnterprise || hasPermission ? <BaseComponent {...this.props} /> : <div className={className}><NoPermission /></div>
  }
}