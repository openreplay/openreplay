import React from 'react';
import { SideMenuitem } from 'UI';
import SideMenuHeader from './SideMenuHeader';

function SideMenuSection({ title, items, onItemClick }) {
	return (
		<>
			<SideMenuHeader className="mb-4" text={ title }/>
		  { items.map(item =>
				<SideMenuitem
					key={ item.key }		      	
					active={ item.active }
					title={ item.label }
					iconName={ item.icon }
					onClick={() => onItemClick(item)}
				/>
		  )}
		</>
	);
}

SideMenuSection.displayName = "SideMenuSection";

export default SideMenuSection;