import React from 'react';
import { Modal, Icon, Tabs } from 'UI';
import styles from './trackingCodeModal.module.css';
import { editGDPR, saveGDPR } from 'Duck/site';
import { connect } from 'react-redux';
import  ProjectCodeSnippet from './ProjectCodeSnippet';
import InstallDocs from './InstallDocs';
import cn from 'classnames';

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
  }

  renderActiveTab = () => {
    const { site } = this.props;
    switch (this.state.activeTab) {
      case PROJECT:
        return <ProjectCodeSnippet />;
      case DOCUMENTATION:
        return <InstallDocs site={site} />;
    }
    return null;
  }

  render() {
    const { site, displayed, onClose, title = '', subTitle } = this.props;
    const { activeTab } = this.state;
    return (
      displayed &&
      <Modal size="large" onClose={ onClose } open={ displayed } style={{ top: "85px" }} >
        <Modal.Header className={ styles.modalHeader }>
          <div>{ title } { subTitle && <span className="text-sm color-gray-dark">{subTitle}</span>}</div>
          <div className={ cn(styles.closeButton, { 'hidden' : !onClose }) } role="button" tabIndex="-1" onClick={ onClose }>
            <Icon name="close" size="14" />
          </div>
        </Modal.Header>
        <Modal.Content className={ cn(styles.content, 'overflow-y-auto') }>
          <Tabs
            className="px-5"
            tabs={ TABS }
            active={ activeTab } onClick={ this.setActiveTab } />
          <div className="p-5">
              { this.renderActiveTab() }
          </div>
        </Modal.Content>
      </Modal>
    );
  }
}

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  gdpr: state.getIn([ 'site', 'instance', 'gdpr' ]),
  saving: state.getIn([ 'site', 'saveGDPR', 'loading' ]),
}), {
  editGDPR, saveGDPR
})(TrackingCodeModal);