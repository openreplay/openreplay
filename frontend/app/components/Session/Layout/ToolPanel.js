import React from 'react';
import { observer } from 'mobx-react-lite';
import { CloseButton } from 'UI';


function ToolPanel({ toolbar, player }) {
	const currentKey = player.toolPanel.key;
	const tool = toolbar.find(p => p.key === currentKey);
	if (!tool) {
		return null;
	}
	return (
		<div 
			className="relative bg-white mb-2 border-gray-light"
			style={{ height: '300px' }} // Using style is ok for the unique-on-page elements
		>
			<CloseButton onClick={ player.closePanel } size="18" className="absolute top-0 right-0 z-10 p-2 bg-white rounded-full border opacity-25 hover:opacity-100" />
			<tool.Component player={ player } />
		</div>
	);
}

export default observer(ToolPanel);