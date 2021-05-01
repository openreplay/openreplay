import { Loader } from 'UI';
import styles from './logTab.css';

const REQUEST = '[REQUEST]';
const RESPONSE = '[RESPONSE]';

const parse = text => text.split('\n').map((bText) => {
  if (bText.indexOf(REQUEST) !== -1) {
    return (
      <div>
        <span className={ styles.request }>{'REQUEST: '}</span>
        { bText.slice(REQUEST.length) }
      </div>
    );
  }
  if (bText.indexOf(RESPONSE) !== -1) {
    return (
      <div>
        <span className={ styles.responce }>{'RESPONSE: '}</span>
        { bText.slice(RESPONSE.length) }
      </div>
    );
  }
  return bText;
});

export default class LogTab extends React.PureComponent {
  state = {
    blocks: null,
    errors: null,
  };

  componentWillMount() {
    fetch(this.props.src)
      .then(responce => responce.text())
      .then(parse)
      .then(blocks => this.setState({ errors: null, blocks }))
      .catch(errors => this.setState({ errors, blocks: null }));
  }

  scrollToSelected = (wrapper) => {
    const { selectedIndex } = this.props;
    if (!selectedIndex || !wrapper) return;
    wrapper.scrollTop = wrapper.children[ selectedIndex ].offsetTop;
  }

  render() {
    const { blocks, errors } = this.state;
    const { selectedIndex, className } = this.props;
    if (errors) return 'Connection error';
    if (!blocks) return <Loader />;
    return (
      <div className={ `${ className } ${ styles.logTab }` } ref={ this.scrollToSelected }>
        { blocks.map((block, i) =>
          <div className={ styles.block } data-selected={ selectedIndex === i }> { block } </div>)}
      </div>
    );
  }
}
