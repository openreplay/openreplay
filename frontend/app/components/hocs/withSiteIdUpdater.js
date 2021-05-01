import { connect } from 'react-redux';
import  { withSiteId } from 'App/routes';
import { setSiteId } from 'Duck/user';

export default BaseComponent =>
@connect((state, props) => ({
  urlSiteId: props.match.params.siteId,
  siteId: state.getIn([ 'user', 'siteId' ]),
}), {
  setSiteId,
})
class extends React.PureComponent {
  state = { load: false }
  constructor(props) {
    super(props);
    if (props.urlSiteId && props.urlSiteId !== props.siteId) {
      props.setSiteId(props.urlSiteId);
    }
  }
  componentDidUpdate(prevProps) {
    const { urlSiteId, siteId, location: { pathname }, history } = this.props;
    const shouldUrlUpdate = urlSiteId && urlSiteId !== siteId;
    if (shouldUrlUpdate) {
      const path = [ '', siteId ].concat(pathname.split('/').slice(2)).join('/');
      history.push(path);
    }
    const shouldBaseComponentReload = shouldUrlUpdate || siteId !== prevProps.siteId;
    if (shouldBaseComponentReload) {
      this.setState({ load: true });
      setTimeout(() => this.setState({ load: false }), 0);
    }
  }

  render() {
    return this.state.load ? null : <BaseComponent { ...this.props } />;
  }
} 