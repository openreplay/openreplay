import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { IconButton, SlideModal, Loader, NoContent, Icon, TextLink } from 'UI';
import { init, fetchList, save, remove } from 'Duck/customField';
import SiteDropdown from 'Shared/SiteDropdown';
import styles from './customFields.css';
import CustomFieldForm from './CustomFieldForm';
import ListItem from './ListItem';
import { confirm } from 'UI/Confirmation';

@connect(state => ({
  fields: state.getIn(['customFields', 'list']).sortBy(i => i.index),
  field: state.getIn(['customFields', 'instance']),
  loading: state.getIn(['customFields', 'fetchRequest', 'loading']),
  sites: state.getIn([ 'user', 'client', 'sites' ]),
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

  onChangeSelect = (event, { value }) => {
    const site = this.props.sites.find(s => s.id === value);
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
            title="No data available."
            size="small"
            show={ fields.size === 0 }
            icon
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
