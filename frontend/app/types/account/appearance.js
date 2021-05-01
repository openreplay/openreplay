import Record from 'Types/Record';
import { WIDGET_KEYS } from 'Types/dashboard';

export const OWNER = 'po';
export const QANALYST = 'qa';
export const DEVELOPER = 'dev';
export const CAGENT = 'agent';
export const CUSTOM ='CUSTOM';
export const NOT_SET = 'NOT_SET';

export const ROLE_NAMES = {
	[ OWNER ]: "Product Owner",
	[ QANALYST ]: "Quality Assurance",
	[ DEVELOPER ]: "Developer",
	[ CAGENT ]: "Customer Success",
	[ CUSTOM ]: "Custom Role",
};

const dashboardAllTrueValues = WIDGET_KEYS.reduce((values, key) => ({ 
	...values, 
	[ key ]: true,
}), {});
const dashboardAllFalseValues = WIDGET_KEYS.reduce((values, key) => ({ 
	...values, 
	[ key ]: false,
}), {});

const Dashboard = Record(dashboardAllTrueValues);

const Appearance = Record({
	role: DEVELOPER,
  sessionsLive: false,
  sessionsDevtools: true,
  tests: false,
  runs: false,
  dashboard: Dashboard().set("userActivity",false),
}, {
	fromJS: appearance => ({
		...appearance,
		dashboard: Dashboard(appearance.dashboard),
	}),
	methods: {
		dashboardSome: function() {
			return WIDGET_KEYS.some(key => this.dashboard[ key ]);
		}
	}
});

export const PREDEFINED_VALUES = {
	[ OWNER ]: Appearance({
		role: OWNER,
		sessionsLive: false,
		sessionsDevtools: false,
		tests: false,
		runs: false,
		 dashboard: Dashboard({
		 	slowestImages: false,
		 	errorsTrend: false,
		}),
	}),
	[ QANALYST ]: Appearance({
		role: QANALYST,
		sessionsLive: false,
		dashboard: Dashboard(dashboardAllFalseValues),
	}),
	[ DEVELOPER ]: Appearance({
		role: DEVELOPER,
		sessionsLive: false,
	  dashboard: Dashboard()
			.set('userActivity', false)
			.set('sessionsFrustration', false)
			.set('sessionsFeedback', false),
	}),
	[ CAGENT ]: Appearance({
		role: CAGENT,
		sessionsDevtools: false,
		tests: false,
		runs: false,
		dashboard: Dashboard(dashboardAllFalseValues),
	}),
	[ CUSTOM ]: Appearance({
		role: CUSTOM,
	}),
}

export default Appearance;