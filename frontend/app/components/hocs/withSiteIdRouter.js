import React from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { withSiteId } from 'App/routes';
import { setSiteId } from 'Duck/site';

export default BaseComponent => {
  @withRouter
  @connect((state, props) => ({
    urlSiteId: props.match.params.siteId,
    siteId: state.getIn(['site', 'siteId']),
  }), {
    setSiteId,
  })
  class WrappedClass extends React.PureComponent {
    push = (location) => {
      const { history, siteId } = this.props;
      if (typeof location === 'string') {
        history.push(withSiteId(location, siteId));
      } else if (typeof location === 'object') {
        history.push({ ...location, pathname: withSiteId(location.pathname, siteId) });
      }
    }

    render() {
      const { history, ...other } = this.props

      return <BaseComponent {...other} history={{ ...history, push: this.push }} />
    }
  }
  return WrappedClass
}