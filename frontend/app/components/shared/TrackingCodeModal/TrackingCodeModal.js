import React from 'react';
import { Tabs } from 'UI';
import ProjectCodeSnippet from './ProjectCodeSnippet';
import InstallDocs from './InstallDocs';

const PROJECT = 'Using Script';
const DOCUMENTATION = 'Using NPM';
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
        const { site } = this.props;
        switch (this.state.activeTab) {
            case PROJECT:
                return <ProjectCodeSnippet site={site} />;
            case DOCUMENTATION:
                return <InstallDocs site={site} />;
        }
        return null;
    };

    render() {
        const { title = '', subTitle } = this.props;
        const { activeTab } = this.state;
        return (
            <div className="bg-white h-screen overflow-y-auto" style={{ width: '700px' }}>
                <h3 className="p-5 text-2xl">
                    {title} {subTitle && <span className="text-sm color-gray-dark">{subTitle}</span>}
                </h3>

                <div>
                    <Tabs className="px-5" tabs={TABS} active={activeTab} onClick={this.setActiveTab} />
                    <div className="p-5">{this.renderActiveTab()}</div>
                </div>
            </div>
        );
    }
}

export default TrackingCodeModal;
