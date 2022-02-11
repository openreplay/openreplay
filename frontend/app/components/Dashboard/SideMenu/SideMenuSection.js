import { SideMenuitem } from 'UI';
import SideMenuHeader from './SideMenuHeader';
import { setShowAlerts } from 'Duck/dashboard';
import stl from './sideMenuSection.css';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { withSiteId } from 'App/routes';
import CustomMetrics from 'Shared/CustomMetrics';

function SideMenuSection({ title, items, onItemClick, setShowAlerts, siteId }) {
	return (
		<>
			<SideMenuHeader className="mb-4" text={ title }/>
		  { items.filter(i => i.section === 'metrics').map(item =>
		      <SideMenuitem
		      	key={ item.key }		      	
		        active={ item.active }
		        title={ item.label }
		        iconName={ item.icon }
		        onClick={() => onItemClick(item)}
		      />
		  )}

			<div className={stl.divider} />
			<div className="my-3">				
				<SideMenuitem
					id="menu-manage-alerts"
					title="Manage Alerts"
					iconName="bell-plus"
					onClick={() => setShowAlerts(true)}
				/>				
			</div>
			<div className={stl.divider} />
			<div className="my-3">		
				<CustomMetrics />
				<div className="color-gray-medium mt-2">
					Be proactive by monitoring the metrics you care about the most.
				</div>
			</div>
		</>
	);
}

SideMenuSection.displayName = "SideMenuSection";

export default connect(state => ({
	siteId: state.getIn([ 'user', 'siteId' ])
}), { setShowAlerts })(SideMenuSection);