import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
/* eslint-disable i18next/no-literal-string */
import React, { ErrorInfo } from 'react';

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
            variant="primary"
            onClick={() => window.location.reload()}
            style={{ width: 'fit-content' }}
          >
            <Icon name="spinner" size={16} />
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PlayerErrorBoundary;
