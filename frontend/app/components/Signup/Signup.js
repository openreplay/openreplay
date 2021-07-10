import withPageTitle from 'HOCs/withPageTitle';
import { Icon } from 'UI';

import stl from './signup.css';
import cn from 'classnames';
import SignupForm from './SignupForm';


const BulletItem = ({ text }) => (
  <div className="flex items-center mb-4">
    <div className="mr-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
      <Icon name="check" size="26"/>
    </div>
    <div>{text}</div>
  </div>
)
@withPageTitle('Signup - Stack RePlay')
export default class Signup extends React.Component {
  render() {
    return (
     <div className="flex" style={{ height: '100vh'}}>
       
     </div>
    );
  }
}
