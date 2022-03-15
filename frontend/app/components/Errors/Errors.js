import { connect } from 'react-redux';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import withPermissions from 'HOCs/withPermissions'
import { UNRESOLVED, RESOLVED, IGNORED, BOOKMARK } from "Types/errorInfo";
import { fetchBookmarks, editOptions } from "Duck/errors";
import { applyFilter } from 'Duck/filters';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { errors as errorsRoute, isRoute } from "App/routes";
import DateRange from 'Components/BugFinder/DateRange';
import withPageTitle from 'HOCs/withPageTitle';
import cn from 'classnames';

import List from './List/List';
import ErrorInfo from './Error/ErrorInfo';
import Header from './Header';
import SideMenuSection from './SideMenu/SideMenuSection';
import SideMenuDividedItem from './SideMenu/SideMenuDividedItem';

const ERRORS_ROUTE = errorsRoute();

function getStatusLabel(status) {
	switch(status) {
		case UNRESOLVED:
			return "Unresolved";
		case RESOLVED:
			return "Resolved";
		case IGNORED:
			return "Ignored";
		default: 
			return "";
	}
}

@withPermissions(['ERRORS'], 'page-margin container-90')
@withSiteIdRouter
@connect(state => ({
	list: state.getIn([ "errors", "list" ]),
	status: state.getIn([ "errors", "options", "status" ]),
}), {
	fetchBookmarks,
	applyFilter,
	fetchSlackList,
	editOptions,
})
@withPageTitle("Errors - OpenReplay")
export default class Errors extends React.PureComponent {
	constructor(props) {
		super(props)
		this.state = {
			filter: '',
		}
	}

	componentDidMount() {
		this.props.fetchSlackList(); // Delete after implementing cache
	}

	ensureErrorsPage() {
		const { history } = this.props;
		if (!isRoute(ERRORS_ROUTE, history.location.pathname)) {
			history.push(ERRORS_ROUTE);
		}
	}

	onStatusItemClick = ({ key }) => {
		this.props.editOptions({ status: key });
	}

	onBookmarksClick = () => {
		this.props.editOptions({ status: BOOKMARK });
	}


	render() {
		const { 
			count,
			match: { 
				params: { errorId } 
			},
			status,
			list,
			history,
		} = this.props;

		return (
			<div className="page-margin container-90" >
				<div className={cn("side-menu", {'disabled' : !isRoute(ERRORS_ROUTE, history.location.pathname)})}>
					<SideMenuSection
						title="Errors"
						onItemClick={this.onStatusItemClick}
						items={[
							{
								key: UNRESOLVED,
								icon: "exclamation-circle",
								label: getStatusLabel(UNRESOLVED),
								active: status === UNRESOLVED,
							},
							{
								key: RESOLVED,
								icon: "check",
								label: getStatusLabel(RESOLVED),
								active: status === RESOLVED,
							},
							{
								key: IGNORED,
								icon: "ban",
								label: getStatusLabel(IGNORED),
								active: status === IGNORED,
	    					}
						]}
					/>
					<SideMenuDividedItem 
						className="mt-3 mb-4"
						iconName="star"
						title="Bookmarks"
						active={ status === BOOKMARK }
						onClick={ this.onBookmarksClick }
					/>				
				</div>

				<div className="side-menu-margined">
					{ errorId == null ?
						<>							
							<div className="mb-5 flex">
								<Header 
									text={ status === BOOKMARK ? "Bookmarks" : getStatusLabel(status) }
									count={ list.size }
								/>
								<div className="ml-3 flex items-center">
				          <span className="mr-2 color-gray-medium">Seen in</span>
				          <DateRange />
				        </div>
				      </div>
							<List 
								status={ status }
								list={ list }
							/>
						</>
						:
						<ErrorInfo errorId={ errorId } list={ list } />
					}
				</div>
			</div>
		);
	}
}