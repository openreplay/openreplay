import ConsoleContent from '../../Session_/Console/ConsoleContent';
import styles from './consoleTab.css';

const HEEADER_HEIGHT = 550;

export default class ConsoleTab extends React.Component {
  vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - HEEADER_HEIGHT;
  
  constructor(props) {
    super(props);    
    this.state = { blocks: null, errors: props.errors };    
  }

  render() {
    const { className, logs } = this.props;    
    return (
      <div className={ `${ className } ${ styles.consoleTab }` }>
        <ConsoleContent isResult logs={logs} additionalHeight={this.vh} />
      </div>
    );
  }
}
