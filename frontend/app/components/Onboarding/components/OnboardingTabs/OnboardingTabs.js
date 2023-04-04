import React from 'react';
import { Tabs } from 'UI';
import ProjectCodeSnippet from './ProjectCodeSnippet';
import InstallDocs from './InstallDocs';

const PROJECT = 'SCRIPT';
const DOCUMENTATION = 'NPM';
const TABS = [
  { key: DOCUMENTATION, text: DOCUMENTATION },
  { key: PROJECT, text: PROJECT },
];

class TrackingCodeModal extends React.PureComponent {
  state = { copied: false, changed: false, activeTab: DOCUMENTATION };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  renderActiveTab = () => {
    switch (this.state.activeTab) {
      case PROJECT:
        return <ProjectCodeSnippet />;
      case DOCUMENTATION:
        return <InstallDocs />;
    }
    return null;
  };

  render() {
    const { activeTab } = this.state;
    return (
      <>
        <Tabs tabs={TABS} active={activeTab} onClick={this.setActiveTab} />
        <div className="p-5 py-8">{this.renderActiveTab()}</div>
      </>
    );
  }
}

export default TrackingCodeModal;
