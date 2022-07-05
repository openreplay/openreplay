import React from 'react';
import { connect } from 'react-redux';
import { Form, Input, Button, Icon } from 'UI';
import { save, edit, update , fetchList, remove } from 'Duck/site';
import { pushNewSite } from 'Duck/user';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import styles from './siteForm.module.css';
import { confirm } from 'UI';

@connect(state => ({
	site: state.getIn([ 'site', 'instance' ]),
	sites: state.getIn([ 'site', 'list' ]),
	siteList: state.getIn([ 'site', 'list' ]),
	loading: state.getIn([ 'site', 'save', 'loading' ]),
}), {
	save,
	remove,
	edit,
	update,
	pushNewSite,
	fetchList,
  	setSiteId
})
@withRouter
export default class NewSiteForm extends React.PureComponent {
	state = {
		existsError: false,
	}

	onSubmit = e => {
		e.preventDefault();
		const { site, siteList, location: { pathname } } = this.props;
		if (!site.exists() && siteList.some(({ name }) => name === site.name)) {
			return this.setState({ existsError: true });
		}
		if (site.exists()) {
			this.props.update(this.props.site, this.props.site.id).then(() => {
				this.props.onClose(null)
				this.props.fetchList();
			})
		} else {
			this.props.save(this.props.site).then(() => {
				this.props.fetchList().then(() => {
					const { sites } = this.props;
					const site = sites.last();
					if (!pathname.includes('/client')) {
						this.props.setSiteId(site.get('id'))
					}
					this.props.onClose(null, site)
				})
        		
				// this.props.pushNewSite(site)
			});
		}
	}

	remove = async (site) => {
		if (await confirm({
		  header: 'Projects',
		  confirmation: `Are you sure you want to delete this Project? We won't be able to record anymore sessions.`
		})) {
		  this.props.remove(site.id).then(() => {
			this.props.onClose(null)
		  });
		}
	};

	edit = ({ target: { name, value } }) => {
		this.setState({ existsError: false });
 		this.props.edit({ [ name ]: value });
 	}

	render() {
		const { site, loading } = this.props;
		return (
			<Form className={ styles.formWrapper } onSubmit={ site.validate() && this.onSubmit }>
        		<div className={ styles.content }>
					<Form.Field>
						<label>{ 'Name' }</label>
						<Input
							placeholder="Ex. openreplay"
							name="name"
							value={ site.name }
							onChange={ this.edit }
							className={ styles.input }
						/>
					</Form.Field>
					<div className="mt-6 flex justify-between">
						<Button							
							variant="primary"
							type="submit"							
							className="float-left mr-2"
							loading={ loading }
							disabled={ !site.validate() }
						>
							{site.exists() ? 'Update' : 'Add'}
						</Button>
						<Button variant="text" type="button" plain onClick={() => this.remove(site)}>
							<Icon name="trash" size="16" />
						</Button>
					</div>
					{ this.state.existsError &&
						<div className={ styles.errorMessage }>
							{ "Site exists already. Please choose another one." }
						</div>
					}
	        	</div>
      		</Form>
	  	);
	}
}