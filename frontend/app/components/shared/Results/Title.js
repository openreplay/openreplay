import { BackLink } from 'UI';
import styles from './title.css';

const Title = ({ goBack }) => (!!goBack ?
  <div className={ styles.title }>
    <BackLink onClick={ goBack } /> 
    { "Last Results" }
  </div>
  :
  "Results"
);

Title.displayName = "Title";

export default Title;
