import { connect } from 'react-redux';
import { Input, Button, Label } from 'UI';
import { save, edit, update , fetchList } from 'Duck/site';
import { pushNewSite } from 'Duck/user';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import styles from './siteForm.css';

@connect(state => ({
	site: state.getIn([ 'site', 'instance' ]),
	sites: state.getIn([ 'site', 'list' ]),
	siteList: state.getIn([ 'site', 'list' ]),
	loading: state.getIn([ 'site', 'save', 'loading' ]),
}), {
	save,
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
				const { sites } = this.props;        
        const site = sites.last();

        this.props.pushNewSite(site)
        if (!pathname.includes('/client')) {
          this.props.setSiteId(site.id)
        }
				this.props.onClose(null, site)
			});
		}
	}

	edit = ({ target: { name, value } }) => {
		this.setState({ existsError: false });
 		this.props.edit({ [ name ]: value });
 	}

	render() {
		const { site, loading } = this.props;
		return (
			<form className={ styles.formWrapper } onSubmit={ this.onSubmit }>
        <div className={ styles.content }>
					<div className={ styles.formGroup }>
		        <label>{ 'Name' }</label>
		        <Input
		          placeholder="Ex. openreplay"
		          name="name"
		          value={ site.name }
		          onChange={ this.edit }
		          className={ styles.input }
		        />
		      </div>
					<div className="mt-6">
						<Button							
							primary
							type="submit"							
							marginRight
							loading={ loading }
							content={site.exists() ? 'Update' : 'Add'}
						/>
					</div>		      
		      { this.state.existsError &&
		      	<div className={ styles.errorMessage }>
		      		{ "Site exists already. Please choose another one." }
		      	</div>
		      }
        </div>        
      </form>
	  );
	}
}