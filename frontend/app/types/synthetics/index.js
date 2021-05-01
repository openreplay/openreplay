import { Map, List } from 'immutable';
import Session from 'Types/session';
import { camelCased } from 'App/utils';

import { getChartFormatter } from './helper'; 
import DomBuildingTime from './domBuildingTime';
import ResourceLoadingTime from './resourceLoadingTime';

export const WIDGET_LIST = [
  {
		key: "resourcesLoadingTime",
		name: "Resource Fetch Time",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'resources',
		dataWrapper: (list, period) => DomBuildingTime(list)
			.update("chart", getChartFormatter(period))
	},
];

export const WIDGET_KEYS = WIDGET_LIST.map(({ key }) => key);

const WIDGET_MAP = {};
WIDGET_LIST.forEach(w => { WIDGET_MAP[ w.key ] = w; });

const OVERVIEW_WIDGET_MAP = {};
WIDGET_LIST.filter(w => w.type === 'overview').forEach(w => { OVERVIEW_WIDGET_MAP[ w.key ] = w; });

export { 
	WIDGET_MAP,
	OVERVIEW_WIDGET_MAP
};
