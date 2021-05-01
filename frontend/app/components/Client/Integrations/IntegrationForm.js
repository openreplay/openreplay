import { connect } from 'react-redux';
import { Select, Form, Button, Checkbox } from 'UI';
import SiteDropdown from 'Shared/SiteDropdown';
import { save, init, edit, remove, fetchList } from 'Duck/integrations/actions';

@connect((state, { name, customPath }) => ({
  sites: state.getIn([ 'user', 'client', 'sites' ]),
  initialSiteId: state.getIn([ 'user', 'siteId' ]),
  list: state.getIn([ name, 'list' ]),
  config: state.getIn([ name, 'instance']),
  saving: state.getIn([ customPath || name, 'saveRequest', 'loading']),
  removing: state.getIn([ name, 'removeRequest', 'loading']),
}), {
  save,
  init,
  edit,
  remove,
  fetchList
})
export default class IntegrationForm extends React.PureComponent {
  constructor(props) {
    super(props);
    const currentSiteId = this.props.initialSiteId;
    this.state = { currentSiteId };
    this.init(currentSiteId);
  }
  
  write = ({ target: { value, name: key, type, checked } }) => {
    if (type === 'checkbox')
      this.props.edit(this.props.name, { [ key ]: checked })
    else
      this.props.edit(this.props.name, { [ key ]: value })
  };

  onChangeSelect = (event, { value }) => {
    const { sites, list, name } = this.props;
    const site = sites.find(s => s.id === value);
    this.setState({ currentSiteId: site.id })
    this.init(value);
  }

  init = (siteId) => {
    const { list, name } = this.props;
    const config = (parseInt(siteId) > 0) ? list.find(s => s.projectId === siteId) : undefined;    
    this.props.init(name, config ? config : list.first());
  }

  save = () => {
    const { config, name, customPath } = this.props;
    const isExists = config.exists();
    const { currentSiteId } = this.state;
    const { ignoreProject } = this.props;
    this.props.save(customPath || name, (!ignoreProject ? currentSiteId : null), config)
      .then(() => {
        this.props.fetchList(name)
        this.props.onClose();
        if (isExists) return;
      });
  }

  remove = () => {
    const { name, config, ignoreProject } = this.props;
    this.props.remove(name, !ignoreProject ? config.projectId : null).then(function() {
      this.props.onClose();
      this.props.fetchList(name)
    }.bind(this));
  }

  render() {
    const { config, saving, removing, formFields, name, loading, ignoreProject } = this.props;
    const { currentSiteId } = this.state;

    return (
      <div className="ph-20">
        <Form>
          {!ignoreProject &&
            <Form.Field>
              <label>{ 'Site' }</label>
              <SiteDropdown
                value={ currentSiteId }
                onChange={ this.onChangeSelect }
              />
            </Form.Field>
          }

          { formFields.map(({
              key,
              label, 
              placeholder=label,
              component: Component = 'input',
              type = "text",
              checkIfDisplayed,
              autoFocus=false
            }) => (typeof checkIfDisplayed !== 'function' || checkIfDisplayed(config)) &&
              ((type === 'checkbox') ?
                <Form.Field key={ key }>
                  <Checkbox
                    label={label}
                    name={ key }                    
                    value={ config[ key ] }
                    onChange={ this.write }
                    placeholder={ placeholder }
                    type={ Component === 'input' ? type : null }
                  />
                </Form.Field>
              :
                <Form.Field key={ key }>
                  <label>{ label }</label>
                  <Component
                    name={ key }
                    value={ config[ key ] }
                    onChange={ this.write }
                    placeholder={ placeholder }
                    type={ Component === 'input' ? type : null }
                    autoFocus={autoFocus}
                  />
                </Form.Field>
              )
          )}
          
          <Button
            onClick={ this.save }
            disabled={ !config.validate() }
            loading={ saving || loading }
            primary
            marginRight
          >
            { config.exists() ? 'Update' : 'Add' }
          </Button>

          <Button
            data-hidden={ !config.exists() }
            loading={ removing }
            onClick={ this.remove }
            outline
          >
            { 'Delete' }
          </Button>
        </Form>
      </div>
    );
  }
}
