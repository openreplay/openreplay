import React from 'react';
import { SideMenuitem } from "UI";
import Divider from 'Components/Errors/ui/Divider';
function SideMenuDividedItem({ className, noTopDivider = false, noBottomDivider = false, ...props }) {
	return (
		<div className={className}>
			{ !noTopDivider && <Divider /> }
	    <SideMenuitem
	    	className="my-3"
	      { ...props }
	    />
	    { !noBottomDivider && <Divider /> }
    </div>
	);
}

SideMenuDividedItem.displayName = "SideMenuDividedItem";

export default SideMenuDividedItem;

