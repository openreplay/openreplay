import { connect } from 'react-redux';
import { Select } from 'UI';

const SiteDropdown = ({ contextName="", sites, onChange, value }) => {
	const options = sites.map(site => ({ value: site.id, text: site.host })).toJS();
  return (
  	<Select
		name={ `${ contextName }_site` }
	    placeholder="Select Site"
	    options={ options }
	    value={ value }
	    onChange={ onChange }
	  />
	);
}

SiteDropdown.displayName = "SiteDropdown";

export default connect(state => ({
	sites: state.getIn([ 'site', 'list' ]),
}))(SiteDropdown);