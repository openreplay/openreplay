import React from 'react';
import { withRouter } from 'react-router-dom';
import { removeQueryParams, addQueryParams, setQueryParams, parseQuery } from 'App/routes';

/* eslint-disable react/sort-comp */

const withLocationHandlers = (propNames) => (BaseComponent) => {
  @withRouter
  class WrapperClass extends React.Component {
    getQuery = (names) => parseQuery(this.props.location, names);
    getParam = (name) => parseQuery(this.props.location)[name];
    addQuery = (params) => {
      const { location, history } = this.props;
      history.push(addQueryParams(location, params));
    };
    removeQuery = (names = [], replace = false) => {
      const { location, history } = this.props;

      const namesArray = Array.isArray(names) ? names : [names];
      /* to avoid update stack overflow */
      const actualNames = Object.keys(this.getQuery(namesArray));

      if (actualNames.length > 0) {
        history[replace ? 'replace' : 'push'](removeQueryParams(location, actualNames));
      }
    };
    setQuery = (params, replace = false) => {
      const { location, history } = this.props;
      history[replace ? 'replace' : 'push'](setQueryParams(location, params));
    };
    query = {
      all: this.getQuery,
      get: this.getParam,
      add: this.addQuery,
      remove: this.removeQuery,
      set: this.setQuery, // TODO: use namespaces
    };

    getHash = () => this.props.location.hash.substring(1);
    setHash = (hash) => {
      const { location, history } = this.props;
      history.push({ ...location, hash: `#${hash}` });
    };
    removeHash = () => {
      const { location, history } = this.props;
      history.push({ ...location, hash: '' });
    };
    hash = {
      get: this.getHash,
      set: this.setHash,
      remove: this.removeHash,
    };

    getQueryProps() {
      if (Array.isArray(propNames)) return this.getQuery(propNames);
      if (propNames !== null && typeof propNames === 'object') {
        const values = Object.values(propNames);
        const query = this.getQuery(values);
        const queryProps = {};
        Object.keys(propNames).map((key) => {
          queryProps[key] = query[propNames[key]];
        });
        return queryProps;
      }
      return {};
    }

    render() {
      const queryProps = this.getQueryProps();
      return <BaseComponent query={this.query} hash={this.hash} {...queryProps} {...this.props} />;
    }
  }
  return WrapperClass;
};
export default withLocationHandlers;
