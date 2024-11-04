import React from 'react';
import { resentOrDate } from 'App/date';

function DateAgo({ className, title, timestamp }) {
	return (
		<div className={className}>
			<h4 className="font-medium">{ title }</h4>
			<span className="text-sm">
				{ `${ resentOrDate(timestamp) }` }
			</span>
		</div>
	);
}

DateAgo.displayName = "DateAgo";
export default DateAgo;