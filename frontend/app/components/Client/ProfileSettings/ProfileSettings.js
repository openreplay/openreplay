import withPageTitle from 'HOCs/withPageTitle';
import Settings from './Settings';
import ChangePassword from './ChangePassword';
import styles from './profileSettings.css';
import Api from './Api';
import TenantKey from './TenantKey';
import OptOut from './OptOut';
import Licenses from './Licenses';
import { connect } from 'react-redux';

@withPageTitle('Account - Stack RePlay Preferences')
export default class ProfileSettings extends React.PureComponent {  
  render() {
    const { account } = this.props;
    return (
      <React.Fragment>
       
      </React.Fragment>
    );
  }
}
