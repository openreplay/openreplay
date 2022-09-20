import React from 'react';
import { connect } from 'react-redux';
import { Input, Form, Button, Checkbox, Loader } from 'UI';
import SiteDropdown from 'Shared/SiteDropdown';
import { save, init, edit, remove } from 'Duck/integrations/actions';
import { fetchIntegrationList } from 'Duck/integrations/integrations';

@connect(
    (state, { name, customPath }) => ({
        sites: state.getIn(['site', 'list']),
        initialSiteId: state.getIn(['site', 'siteId']),
        list: state.getIn([name, 'list']),
        config: state.getIn([name, 'instance']),
        loading: state.getIn([name, 'fetchRequest', 'loading']),
        saving: state.getIn([customPath || name, 'saveRequest', 'loading']),
        removing: state.getIn([name, 'removeRequest', 'loading']),
        siteId: state.getIn(['integrations', 'siteId']),
    }),
    {
        save,
        init,
        edit,
        remove,
        // fetchList,
        fetchIntegrationList,
    }
)
export default class IntegrationForm extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    fetchList = () => {
        const { siteId, initialSiteId } = this.props;
        if (!siteId) {
            this.props.fetchIntegrationList(initialSiteId);
        } else {
            this.props.fetchIntegrationList(siteId);
        }
    }

    write = ({ target: { value, name: key, type, checked } }) => {
        if (type === 'checkbox') this.props.edit(this.props.name, { [key]: checked });
        else this.props.edit(this.props.name, { [key]: value });
    };

    // onChangeSelect = ({ value }) => {
    //     const { sites, list, name } = this.props;
    //     const site = sites.find((s) => s.id === value.value);
    //     this.setState({ currentSiteId: site.id });
    //     this.init(value.value);
    // };

    // init = (siteId) => {
    //     const { list, name } = this.props;
    //     const config = parseInt(siteId) > 0 ? list.find((s) => s.projectId === siteId) : undefined;
    //     this.props.init(name, config ? config : list.first());
    // };

    save = () => {
        const { config, name, customPath, ignoreProject } = this.props;
        const isExists = config.exists();
        // const { currentSiteId } = this.state;
        this.props.save(customPath || name, !ignoreProject ? this.props.siteId : null, config).then(() => {
            // this.props.fetchList(name);
            this.fetchList();
            this.props.onClose();
            if (isExists) return;
        });
    };

    remove = () => {
        const { name, config, ignoreProject } = this.props;
        this.props.remove(name, !ignoreProject ? config.projectId : null).then(
            function () {
                this.props.onClose();
                this.fetchList();
            }.bind(this)
        );
    };

    render() {
        const { config, saving, removing, formFields, name, loading, ignoreProject } = this.props;
        // const { currentSiteId } = this.state;

        return (
            <Loader loading={loading}>
                <div className="ph-20">
                    <Form>
                        {/* {!ignoreProject && (
                        <Form.Field>
                            <label>{'OpenReplay Project'}</label>
                            <SiteDropdown value={currentSiteId} onChange={this.onChangeSelect} />
                        </Form.Field>
                    )} */}

                        {formFields.map(
                            ({
                                key,
                                label,
                                placeholder = label,
                                component: Component = 'input',
                                type = 'text',
                                checkIfDisplayed,
                                autoFocus = false,
                            }) =>
                                (typeof checkIfDisplayed !== 'function' || checkIfDisplayed(config)) &&
                                (type === 'checkbox' ? (
                                    <Form.Field key={key}>
                                        <Checkbox
                                            label={label}
                                            name={key}
                                            value={config[key]}
                                            onChange={this.write}
                                            placeholder={placeholder}
                                            type={Component === 'input' ? type : null}
                                        />
                                    </Form.Field>
                                ) : (
                                    <Form.Field key={key}>
                                        <label>{label}</label>
                                        <Input
                                            name={key}
                                            value={config[key]}
                                            onChange={this.write}
                                            placeholder={placeholder}
                                            type={Component === 'input' ? type : null}
                                            autoFocus={autoFocus}
                                        />
                                    </Form.Field>
                                ))
                        )}

                        <Button
                            onClick={this.save}
                            disabled={!config.validate()}
                            loading={saving || loading}
                            variant="primary"
                            className="float-left mr-2"
                        >
                            {config.exists() ? 'Update' : 'Add'}
                        </Button>

                        {config.exists() && (
                            <Button loading={removing} onClick={this.remove}>
                                {'Delete'}
                            </Button>
                        )}
                    </Form>
                </div>
            </Loader>
        );
    }
}
