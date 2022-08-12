import React from 'react';
import APIClient from 'App/api_client';

export default ({
        initialData = null,
        endpoint = '',
        method = 'GET',
        requestName = 'request',
        loadingName = 'loading',
        errorName = 'requestError',
        dataName = 'data',
        dataWrapper = (data) => data,
        loadOnInitialize = false,
        resetBeforeRequest = false, // Probably  use handler?
    }) =>
    (BaseComponent) =>
        class extends React.PureComponent {
            constructor(props) {
                super(props);
                this.state = {
                    data: typeof initialData === 'function' ? initialData(props) : initialData,
                    loading: loadOnInitialize,
                    error: false,
                };
                if (loadOnInitialize) {
                    this.request();
                }
            }

            request = (params, edpParams) => {
                this.setState({
                    loading: true,
                    error: false,
                    data: resetBeforeRequest ? (typeof initialData === 'function' ? initialData(this.props) : initialData) : this.state.data,
                });
                const edp = typeof endpoint === 'function' ? endpoint(this.props, edpParams) : endpoint;
                return new APIClient()
                    [method.toLowerCase()](edp, params)
                    .then((response) => response.json())
                    .then(({ errors, data }) => {
                        if (errors) {
                            return this.setError();
                        }
                        this.setState({
                            data: dataWrapper(data, this.state.data),
                            loading: false,
                        });
                    })
                    .catch(this.setError);
            };

            setError = () =>
                this.setState({
                    loading: false,
                    error: true,
                });

            render() {
                const ownProps = {
                    [requestName]: this.request,
                    [loadingName]: this.state.loading,
                    [dataName]: this.state.data,
                    [errorName]: this.state.error,
                };
                return <BaseComponent {...this.props} {...ownProps} />;
            }
        };
