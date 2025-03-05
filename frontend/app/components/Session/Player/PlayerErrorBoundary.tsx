/* eslint-disable i18next/no-literal-string */
import React, { ErrorInfo } from 'react';
import { Button } from 'antd';
import { Icon } from 'UI';

class PlayerErrorBoundary extends React.Component<any> {
  state = { hasError: false, error: '' };

  constructor(props: any) {
    super(props);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({
      hasError: true,
      error: error + info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col p-4 gap-4">
          <h4>Something went wrong during player rendering.</h4>
          <p>{this.state.error}</p>
          <Button
            onClick={() => window.location.reload()}
            icon={<Icon name="spinner" size={16} />}
            type="primary"
            style={{ width: 'fit-content' }}
          >
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PlayerErrorBoundary;
