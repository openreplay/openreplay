import React from 'react';
import { Tabs } from 'UI';
import ProjectCodeSnippet from './ProjectCodeSnippet';
import InstallDocs from './InstallDocs';
import DocCard from 'Shared/DocCard/DocCard';

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
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <ProjectCodeSnippet />
            </div>

            <div className="col-span-2">
              <DocCard title="Need help from team member?">Invite and Collaborate</DocCard>
              <DocCard title="Project Key">Invite and Collaborate</DocCard>
              <DocCard title="Other ways to install">Invite and Collaborate</DocCard>
            </div>
          </div>
        );
      case DOCUMENTATION:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <InstallDocs />
            </div>

            <div className="col-span-2">
              <DocCard title="Need help from team member?">Invite and Collaborate</DocCard>
            </div>
          </div>
        );
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
