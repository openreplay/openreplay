import { connect } from 'react-redux';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import withPermissions from 'HOCs/withPermissions'
import { UNRESOLVED, RESOLVED, IGNORED } from "Types/errorInfo";
import { getRE } from 'App/utils';
import { fetchBookmarks } from "Duck/errors";
import { applyFilter } from 'Duck/filters';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { errors as errorsRoute, isRoute } from "App/routes";
import EventFilter from 'Components/BugFinder/EventFilter';
import DateRange from 'Components/BugFinder/DateRange';

import { SavedSearchList } from 'UI';

import List from './List/List';
import ErrorInfo from './Error/ErrorInfo';
import Header from './Header';
import SideMenuSection from './SideMenu/SideMenuSection';
import SideMenuHeader from './SideMenu/SideMenuHeader';
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
}), {
	fetchBookmarks,
	applyFilter,
	fetchSlackList,
})
export default class Errors extends React.PureComponent {
	state = {
		status: UNRESOLVED,
		bookmarksActive: false,
		currentList: this.props.list.filter(e => e.status === UNRESOLVED),
		filter: '',
	}

	componentDidMount() {
		this.props.fetchSlackList(); // Delete after implementing cache
	}

	onFilterChange = ({ target: { value } }) => this.setState({ filter: value })

	componentDidUpdate(prevProps, prevState) {
		const { bookmarksActive, status, filter } = this.state;
		const { list } = this.props;
		if (prevProps.list !== list 
			|| prevState.status !== status
			|| prevState.bookmarksActive !== bookmarksActive
			|| prevState.filter !== filter) {
			const unfiltered = bookmarksActive 
				? list 
				: list.filter(e => e.status === status);
			const filterRE = getRE(filter);
			this.setState({
				currentList: unfiltered
					.filter(e => filterRE.test(e.name) || filterRE.test(e.message)),
			})
		}
	}

	ensureErrorsPage() {
		const { history } = this.props;
		if (!isRoute(ERRORS_ROUTE, history.location.pathname)) {
			history.push(ERRORS_ROUTE);
		}
	}

	onStatusItemClick = ({ key }) => {
		if (this.state.bookmarksActive) {
			this.props.applyFilter();
		}
		this.setState({ 
			status: key,
			bookmarksActive: false,
		});
		this.ensureErrorsPage();
	}

	onBookmarksClick = () => {
		this.setState({
			bookmarksActive: true,
		});
		this.props.fetchBookmarks();
		this.ensureErrorsPage();
	}


	render() {
		const { 
			count,
			match: { 
				params: { errorId } 
			},
		} = this.props;
		const { status, bookmarksActive, currentList } = this.state;

		return (
			<div className="page-margin container-90" >
				<div className="side-menu">
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
						active={ bookmarksActive }
						onClick={ this.onBookmarksClick }
					/>				
				</div>

				<div className="side-menu-margined">
					{ errorId == null ?
						<>							
							<div className="mb-5 flex">
								<Header 
									text={ bookmarksActive ? "Bookmarks" : getStatusLabel(status) }
									count={ currentList.size }
								/>
								<div className="ml-3 flex items-center">
				          <span className="mr-2 color-gray-medium">Seen in</span>
				          <DateRange />
				        </div>
				      </div>
							<List 
								status={ status }
								list={ currentList }
								onFilterChange={this.onFilterChange}
							/>
						</>
						:
						<ErrorInfo errorId={ errorId } list={ currentList } />
					}
				</div>
			</div>
		);
	}
}