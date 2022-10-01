import React from 'react';
import { connect } from 'react-redux';
import { Form, Input, Button, Icon } from 'UI';
import { save, edit, update, fetchList, remove } from 'Duck/site';
import { pushNewSite } from 'Duck/user';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import styles from './siteForm.module.css';
import { confirm } from 'UI';
import { clearSearch } from 'Duck/search';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { withStore } from 'App/mstore';

@connect(
    (state) => ({
        site: state.getIn(['site', 'instance']),
        sites: state.getIn(['site', 'list']),
        siteList: state.getIn(['site', 'list']),
        loading: state.getIn(['site', 'save', 'loading']) || state.getIn(['site', 'remove', 'loading']),
    }),
    {
        save,
        remove,
        edit,
        update,
        pushNewSite,
        fetchList,
        setSiteId,
        clearSearch,
        clearSearchLive,
    }
)
@withRouter
@withStore
export default class NewSiteForm extends React.PureComponent {
    state = {
        existsError: false,
    };
    

    componentDidMount() {
        const {
            location: { pathname },
            match: {
                params: { siteId },
            },
        } = this.props;
        if (pathname.includes('onboarding')) {
            this.props.setSiteId(siteId);
        }
    }

    onSubmit = (e) => {
        e.preventDefault();
        const {
            site,
            siteList,
            location: { pathname },
        } = this.props;
        if (!site.exists() && siteList.some(({ name }) => name === site.name)) {
            return this.setState({ existsError: true });
        }
        if (site.exists()) {
            this.props.update(this.props.site, this.props.site.id).then(() => {
                this.props.onClose(null);
                this.props.fetchList();
            });
        } else {
            this.props.save(this.props.site).then(() => {
                this.props.onClose(null);
                this.props.clearSearch();
                this.props.clearSearchLive();
                this.props.mstore.initClient();
            });
        }
    };

    remove = async (site) => {
        if (
            await confirm({
                header: 'Projects',
                confirmation: `Are you sure you want to delete this Project? We won't be able to record anymore sessions.`,
            })
        ) {
            this.props.remove(site.id).then(() => {
                this.props.onClose(null);
            });
        }
    };

    edit = ({ target: { name, value } }) => {
        this.setState({ existsError: false });
        this.props.edit({ [name]: value });
    };

    render() {
        const { site, loading } = this.props;
        return (
            <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
                <h3 className="p-5 text-2xl">{site.exists() ? 'Edit Project' : 'New Project'}</h3>
                <Form className={styles.formWrapper} onSubmit={site.validate() && this.onSubmit}>
                    <div className={styles.content}>
                        <Form.Field>
                            <label>{'Name'}</label>
                            <Input placeholder="Ex. openreplay" name="name" value={site.name} onChange={this.edit} className={styles.input} />
                        </Form.Field>
                        <div className="mt-6 flex justify-between">
                            <Button variant="primary" type="submit" className="float-left mr-2" loading={loading} disabled={!site.validate()}>
                                {site.exists() ? 'Update' : 'Add'}
                            </Button>
                            {site.exists() && (
                                <Button variant="text" type="button" onClick={() => this.remove(site)}>
                                    <Icon name="trash" size="16" />
                                </Button>
                            )}
                        </div>
                        {this.state.existsError && <div className={styles.errorMessage}>{'Site exists already. Please choose another one.'}</div>}
                    </div>
                </Form>
            </div>
        );
    }
}
