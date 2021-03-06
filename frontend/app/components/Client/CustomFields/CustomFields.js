import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { IconButton, SlideModal, Loader, NoContent, Icon, TextLink } from 'UI';
import { init, fetchList, save, remove } from 'Duck/customField';
import SiteDropdown from 'Shared/SiteDropdown';
import styles from './customFields.module.css';
import CustomFieldForm from './CustomFieldForm';
import ListItem from './ListItem';
import { confirm } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

@connect(state => ({
  fields: state.getIn(['customFields', 'list']).sortBy(i => i.index),
  field: state.getIn(['customFields', 'instance']),
  loading: state.getIn(['customFields', 'fetchRequest', 'loading']),
  sites: state.getIn([ 'site', 'list' ]),
  errors: state.getIn([ 'customFields', 'saveRequest', 'errors' ]),
}), {
  init,
  fetchList,
  save,
  remove,
})
@withPageTitle('Metadata - OpenReplay Preferences')
class CustomFields extends React.Component {
  state = { showModal: false, currentSite: this.props.sites.get(0), deletingItem: null };

  componentWillMount() {
    const activeSite = this.props.sites.get(0);
    if (!activeSite) return;
    
    this.props.fetchList(activeSite.id);
  }

  save = (field) => {
    const { currentSite } = this.state;
    this.props.save(currentSite.id, field).then(() => {
      const { errors } = this.props;
      if (!errors || errors.size === 0) {
        return this.closeModal();
      }
    });
  };

  closeModal = () => this.setState({ showModal: false });
  init = (field) => {
    this.props.init(field);
    this.setState({ showModal: true });    
  }

  onChangeSelect = ({ value }) => {
    const site = this.props.sites.find(s => s.id === value.value);
    this.setState({ currentSite: site })
    this.props.fetchList(site.id);
  }

  removeMetadata = async (field) => {
    if (await confirm({
      header: 'Metadata',
      confirmation: `Are you sure you want to remove?`
    })) {
      const { currentSite } = this.state;
      this.setState({ deletingItem: field.index });
      this.props.remove(currentSite.id, field.index)
        .then(() => this.setState({ deletingItem: null }));
    }
  }

  render() {
    const { fields, field, loading } = this.props;
    const { showModal, currentSite, deletingItem } = this.state;
    return (
      <div>
        <SlideModal
          title={ `${ (field.exists() ? 'Update' : 'Add') + ' Metadata Field' }` }
          size="small"
          isDisplayed={ showModal }
          content={ showModal && <CustomFieldForm onClose={ this.closeModal } onSave={ this.save } /> }
          onClose={ this.closeModal }
        />
        <div className={ styles.tabHeader }>
          <h3 className={ cn(styles.tabTitle, "text-2xl") }>{ 'Metadata' }</h3>
          <div style={{ marginRight: '15px' }}>
            <SiteDropdown
              value={ currentSite && currentSite.id }
              onChange={ this.onChangeSelect }
            />
          </div>
          <IconButton circle icon="plus" outline onClick={ () => this.init() } />
          <TextLink
            icon="book"
            className="ml-auto color-gray-medium"
            href="https://docs.openreplay.com/installation/metadata"
            label="Documentation"
          />
        </div>
        
        <Loader loading={ loading }>
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
                <div className="mt-6 text-2xl">No data available.</div>
              </div>
            }
            size="small"
            show={ fields.size === 0 }
            // animatedIcon="empty-state"
          >
            <div className={ styles.list }>
              { fields.filter(i => i.index).map(field => (
                <ListItem
                  disabled={deletingItem && deletingItem === field.index}
                  key={ field._key }
                  field={ field }
                  onEdit={ this.init }
                  onDelete={ () => this.removeMetadata(field) }
                />
              ))}
            </div>
          </NoContent>
        </Loader>
      </div>
    );
  }
}

export default CustomFields;
