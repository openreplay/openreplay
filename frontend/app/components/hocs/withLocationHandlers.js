import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { removeQueryParams, addQueryParams, setQueryParams, parseQuery } from 'App/routes';

const withLocationHandlers = (propNames) => (BaseComponent) => {
  const WrapperComponent = (props) => {
    const location = useLocation();
    const navigate = useNavigate();

    const getQuery = (names) => parseQuery(location, names);
    const getParam = (name) => parseQuery(location)[name];

    const addQuery = (params) => {
      navigate(addQueryParams(location, params));
    };

    const removeQuery = (names = [], replace = false) => {
      const namesArray = Array.isArray(names) ? names : [names];
      /* to avoid update stack overflow */
      const actualNames = Object.keys(getQuery(namesArray));

      if (actualNames.length > 0) {
        const path = removeQueryParams(location, actualNames);
        navigate(path, { replace });
      }
    };

    const setQuery = (params, replace = false) => {
      navigate(setQueryParams(location, params), { replace });
    };

    const query = {
      all: getQuery,
      get: getParam,
      add: addQuery,
      remove: removeQuery,
      set: setQuery, // TODO: use namespaces
    };

    const getHash = () => location.hash.substring(1);

    const setHash = (hash) => {
      navigate({ ...location, hash: `#${hash}` });
    };

    const removeHash = () => {
      navigate({ ...location, hash: '' });
    };

    const hash = {
      get: getHash,
      set: setHash,
      remove: removeHash,
    };

    const getQueryProps = () => {
      if (Array.isArray(propNames)) return getQuery(propNames);
      if (propNames !== null && typeof propNames === 'object') {
        const values = Object.values(propNames);
        const query = getQuery(values);
        const queryProps = {};
        Object.keys(propNames).forEach((key) => {
          queryProps[key] = query[propNames[key]];
        });
        return queryProps;
      }
      return {};
    };

    const queryProps = getQueryProps();
    return <BaseComponent query={query} hash={hash} {...queryProps} {...props} />;
  };

  return WrapperComponent;
};

export default withLocationHandlers;