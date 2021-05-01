import copy from 'copy-to-clipboard';
import { Loader, CodeEditor } from 'UI';
import styles from './codeLoader.css';

export default class CodeLoader extends React.PureComponent {
  static defaultProps = { onOpenResults: Function }

  state = {
    code: null,
    errors: null,
    loading: false,
  }

  componentDidMount() {
    this.loadCode();
  }

  componentWillReceiveProps(newProps) {
    if (newProps.url !== this.props.url) {
      this.loadCode(newProps);
    }
  }

  copyHandler = () => {
    this.setState({ copied: true });
    const { code } = this.state;
    copy(code);
    setTimeout(() => {
      this.setState({ copied: false });
    }, 2000);
  };

  loadCode(props = this.props) {
    const { url } = props;
    if (url) {
      this.setState({ loading: true });
      window.fetch(url)
        .then(responce => responce.text())
        .then(code => this.setState({ errors: null, code, loading: false }))
        .catch(errors => this.setState({ errors, loading: false }));
    } else {
      this.setState({ errors: true })
    }
  }

  render() {
    const {
      code, loading, errors, copied,
    } = this.state;

    if (errors) return "Some error occured...";

    return (
      <div className={ styles.wrapper }>
        <Loader loading={ loading }>
          <div>
            <button className={ styles.codeCopy } onClick={ this.copyHandler }>{ copied ? 'copied' : 'copy' }</button>
            <CodeEditor
              lineNumbers
              className={ styles.codeLoader }
              value={ code }
            />
          </div>
        </Loader>
      </div>
    );
  }
}
