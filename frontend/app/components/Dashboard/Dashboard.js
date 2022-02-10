import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions'
import { setPeriod, setPlatform, fetchMetadataOptions } from 'Duck/dashboard';
import { NoContent, Icon } from 'UI';
import { WIDGET_KEYS, WIDGET_LIST } from 'Types/dashboard';
// import CustomMetrics from 'Shared/CustomMetrics';
import CustomMetricsModal from 'Shared/CustomMetrics/CustomMetricsModal';
import SessionListModal from 'Shared/CustomMetrics/SessionListModal';

import { 
  MissingResources,
  SlowestResources,
  DomBuildingTime,
  ResourceLoadingTime,
  ResponseTime,
  ResponseTimeDistribution,
  TimeToRender,
  SessionsImpactedBySlowRequests,
  MemoryConsumption,
  CpuLoad,
  FPS,
  Crashes,
  SlowestDomains,
  ErrorsPerDomain,
  CallWithErrors,
  ErrorsByType,
  ErrorsByOrigin,
  ResourceLoadedVsResponseEnd,
  ResourceLoadedVsVisuallyComplete,
  SessionsAffectedByJSErrors,
  BreakdownOfLoadedResources,
  SpeedIndexLocation,
  SessionsPerBrowser,
  CallsErrors5xx,
  CallsErrors4xx  
} from './Widgets';

import SideMenuSection from './SideMenu/SideMenuSection';
import styles from './dashboard.css';
import WidgetSection from 'Shared/WidgetSection/WidgetSection';
import OverviewWidgets from './Widgets/OverviewWidgets/OverviewWidgets';
import CustomMetricsWidgets from './Widgets/CustomMetricsWidgets/CustomMetricsWidgets';
import WidgetHolder from './WidgetHolder/WidgetHolder';
import MetricsFilters from 'Shared/MetricsFilters/MetricsFilters';
import { withRouter } from 'react-router';

const OVERVIEW = 'overview';
const PERFORMANCE = 'performance';
const ERRORS_N_CRASHES = 'errors';
const RESOURCES = 'resources';
const CUSTOM_METRICS = 'custom_metrics';

const menuList = [
  {
    key: OVERVIEW,
    section: 'metrics',
    icon: "info-square",
    label: getStatusLabel(OVERVIEW),
    active: status === OVERVIEW,
  },
  {
    key: CUSTOM_METRICS,
    section: 'metrics',
    icon: "sliders",
    label: getStatusLabel(CUSTOM_METRICS),
    active: status === CUSTOM_METRICS,
  },  
  {
    key: ERRORS_N_CRASHES,
    section: 'metrics',
    icon: "exclamation-circle",
    label: getStatusLabel(ERRORS_N_CRASHES),
    active: status === ERRORS_N_CRASHES,
  },
  {
    key: PERFORMANCE,
    section: 'metrics',
    icon: "tachometer-slow",
    label: getStatusLabel(PERFORMANCE),
    active: status === PERFORMANCE,
  },
  {
    key: RESOURCES,
    section: 'metrics',
    icon: "collection",
    label: getStatusLabel(RESOURCES),
    active: status === RESOURCES,
  },

];

function getStatusLabel(status) {
	switch(status) {
		case OVERVIEW:
			return "Overview";
		case CUSTOM_METRICS:
			return "Custom Metrics";
		case PERFORMANCE:
			return "Performance";
    case ERRORS_N_CRASHES:
      return "Errors";
    case RESOURCES:
      return "Resources";
    default: 
			return "";
	}
}

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

@withPermissions(['METRICS'], 'page-margin container-90')
@connect(state => ({
  period: state.getIn([ 'dashboard', 'period' ]),
  comparing: state.getIn([ 'dashboard', 'comparing' ]),
  platform: state.getIn([ 'dashboard', 'platform' ]),
  dashboardAppearance: state.getIn([ 'user', 'account', 'appearance', 'dashboard' ]),
  activeWidget: state.getIn(['customMetrics', 'activeWidget']),
  appearance: state.getIn([ 'user', 'account', 'appearance' ]),
}), { setPeriod, setPlatform, fetchMetadataOptions })
@withPageTitle('Metrics - OpenReplay')
@withRouter
export default class Dashboard extends React.PureComponent {
  constructor(props) {
    super(props)
    this.list = {};
    menuList.forEach(item => {
      this.list[item.key] = React.createRef();
    });
    props.fetchMetadataOptions();  
  }
  
  state = {
    rangeName: this.props.period.rangeName,
    startDate: null, 
    endDate: null,
    pageSection: 'metrics',
  };

  getWidgetsByKey = (widgetType) => {
    return WIDGET_LIST.filter(({ key, type }) => !this.props.appearance.dashboard[ key ] && type === widgetType);
  }

  componentDidMount() {
    const { history, location } = this.props;        
    // TODO check the hash navigato it    
  }

  onMenuItemClick = ({section, key}) => {
    const { history, location } = this.props;
    const path = location.pathname + '#' + key;
    history.push(path);
    this.setState({ pageSection: section });
    setTimeout(function() {
      this.navigateHash(section, key);
    }.bind(this), 10);
  }

  navigateHash = (section, key) => {
    const { history, location } = this.props;

    const element = this.list[key].current;
    const offset = 110;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = element.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    const path = location.pathname + '#' + key;
    history.push(path);
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }

  render() {
    const { dashboardAppearance, comparing, activeWidget } = this.props;
    const { pageSection } = this.state;

    const noWidgets = WIDGET_KEYS
      .filter(key => dashboardAppearance[ key ])
      .length === 0;
    
    return (
      <div className="page-margin container-90">
        <div className="side-menu">
          <SideMenuSection
						title="Metrics"
						onItemClick={this.onMenuItemClick}
						items={menuList}
					/>
        </div>
        <div className="side-menu-margined">
          <div>
            <div className={ cn(styles.header, "flex items-center w-full") }>            
              <MetricsFilters />
              
              { activeWidget && <SessionListModal activeWidget={activeWidget} /> }
            </div>
            <div className="">
              <NoContent
                show={ noWidgets }
                title="You haven't added any insights widgets!"
                subtext="Add new to keep track of Processed Sessions, Application Activity, Errors and lot more."
                icon
                empty
              >
                <WidgetSection
                  title="Overview"
                  type="overview"
                  className="mb-4"
                  description="(Average Values)"
                  widgets={this.getWidgetsByKey(OVERVIEW)}
                >
                  <div className="grid grid-cols-4 gap-4" ref={this.list[OVERVIEW]}>
                    <OverviewWidgets isOverview />
                  </div>
                </WidgetSection>

                <WidgetSection 
                  title="Custom Metrics"
                  type={CUSTOM_METRICS}
                  className="mb-4"
                  widgets={[]}
                  description={
                    <div className="flex items-center">
                      {comparing && (
                        <div className="text-sm flex items-center font-normal">
                          <Icon name="info" size="12" className="mr-2" />
                          Custom Metrics are not supported for comparison.
                        </div>
                      )}
                      {/* <CustomMetrics /> */}
                    </div>
                  }
                >
                  <div className={cn("gap-4 grid grid-cols-2")} ref={this.list[CUSTOM_METRICS]}>
                    <CustomMetricsWidgets onClickEdit={(e) => null}/>
                  </div>
                </WidgetSection>

                <WidgetSection title="Errors" className="mb-4" type="errors" widgets={this.getWidgetsByKey(ERRORS_N_CRASHES)}>
                  <div className={ cn("gap-4", { 'grid grid-cols-2' : !comparing })} ref={this.list[ERRORS_N_CRASHES]}>
                    { dashboardAppearance.impactedSessionsByJsErrors && <WidgetHolder Component={SessionsAffectedByJSErrors} /> }
                    { dashboardAppearance.errorsPerDomains && <WidgetHolder Component={ErrorsPerDomain} /> }
                    { dashboardAppearance.errorsPerType && <WidgetHolder Component={ErrorsByType} /> }
                    { dashboardAppearance.resourcesByParty && <WidgetHolder Component={ErrorsByOrigin} /> }
                    { dashboardAppearance.domainsErrors_4xx && <WidgetHolder Component={CallsErrors4xx} /> }
                    { dashboardAppearance.domainsErrors_5xx && <WidgetHolder Component={CallsErrors5xx} /> }
                    { dashboardAppearance.callsErrors && 
                      <div className="col-span-2"><WidgetHolder fullWidth Component={CallWithErrors} /></div>
                    }
                  </div>
                </WidgetSection>

                <WidgetSection title="Performance" type="performance" className="mb-4" widgets={this.getWidgetsByKey(PERFORMANCE)}>
                  <div className={ cn("gap-4", { 'grid grid-cols-2' : !comparing })} ref={this.list[PERFORMANCE]}>
                    { dashboardAppearance.speedLocation && <WidgetHolder Component={SpeedIndexLocation} /> }
                    { dashboardAppearance.crashes && <WidgetHolder Component={Crashes} /> }
                    { dashboardAppearance.pagesResponseTime && <WidgetHolder Component={ResponseTime} /> }
                    { dashboardAppearance.impactedSessionsBySlowPages && <WidgetHolder Component={SessionsImpactedBySlowRequests} /> }
                    { dashboardAppearance.pagesResponseTimeDistribution && 
                      <div className="col-span-2"><WidgetHolder fullWidth Component={ResponseTimeDistribution} /></div>
                    }
                    { dashboardAppearance.pagesDomBuildtime && <WidgetHolder Component={DomBuildingTime} /> }
                    { dashboardAppearance.timeToRender && <WidgetHolder Component={TimeToRender} /> }
                    { dashboardAppearance.memoryConsumption && <WidgetHolder Component={MemoryConsumption} /> }
                    { dashboardAppearance.cpu && <WidgetHolder Component={CpuLoad} /> }
                    { dashboardAppearance.slowestDomains && <WidgetHolder Component={SlowestDomains} /> }
                    { dashboardAppearance.resourcesVsVisuallyComplete && <WidgetHolder Component={ResourceLoadedVsVisuallyComplete} /> }
                    { dashboardAppearance.fps && <WidgetHolder Component={FPS} /> }
                    { dashboardAppearance.sessionsPerBrowser && <WidgetHolder Component={SessionsPerBrowser} /> }
                  </div>
                </WidgetSection>

                <WidgetSection title="Resources" type="resources" className="mb-4" widgets={this.getWidgetsByKey(RESOURCES)}>
                  <div className={ cn("gap-4", { 'grid grid-cols-2' : !comparing })} ref={this.list[RESOURCES]}>
                    { dashboardAppearance.resourcesCountByType && <WidgetHolder Component={BreakdownOfLoadedResources} /> }
                    { dashboardAppearance.resourcesLoadingTime && <WidgetHolder Component={ResourceLoadingTime} /> }
                    { dashboardAppearance.resourceTypeVsResponseEnd && <WidgetHolder Component={ResourceLoadedVsResponseEnd} /> }
                    { dashboardAppearance.missingResources && <WidgetHolder Component={MissingResources} /> }
                    { dashboardAppearance.slowestResources && 
                      <div className="col-span-2"><WidgetHolder fullWidth Component={SlowestResources} /></div>
                    }
                  </div>
                </WidgetSection>
              </NoContent>
            </div>
          </div>
        </div>

        <CustomMetricsModal />
      </div>
    );
  }
}