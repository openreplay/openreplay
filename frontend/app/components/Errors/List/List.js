import cn from 'classnames';
import { connect } from 'react-redux';
import { Set, List as ImmutableList } from "immutable";
import { NoContent, Loader, Checkbox, LoadMoreButton, IconButton, Input, DropdownPlain } from 'UI';
import { merge, resolve, unresolve, ignore, updateCurrentPage } from "Duck/errors";
import { applyFilter } from 'Duck/filters';
import { IGNORED, RESOLVED, UNRESOLVED } from 'Types/errorInfo';
import SortDropdown from 'Components/BugFinder/Filters/SortDropdown';
import Divider from 'Components/Errors/ui/Divider';
import ListItem from './ListItem/ListItem';

const PER_PAGE = 5;
const DEFAULT_SORT = 'lastOccurrence';
const DEFAULT_ORDER = 'desc';
const sortOptionsMap = {
	'lastOccurrence-desc': 'Last Occurrence',
  'firstOccurrence-desc': 'First Occurrence',
  'sessions-asc': 'Sessions Ascending',
  'sessions-desc': 'Sessions Descending',
  'users-asc': 'Users Ascending',
  'users-desc': 'Users Descending',
};
const sortOptions = Object.entries(sortOptionsMap)
  .map(([ value, text ]) => ({ value, text }));


@connect(state => ({
	loading: state.getIn([ "errors", "loading" ]),
	resolveToggleLoading: state.getIn(["errors", "resolve", "loading"]) || 
		state.getIn(["errors", "unresolve", "loading"]),
	ignoreLoading: state.getIn([ "errors", "ignore", "loading" ]),
	mergeLoading: state.getIn([ "errors", "merge", "loading" ]),
  currentPage: state.getIn(["errors", "currentPage"]),
}), {
	merge,
	resolve,
	unresolve,
	ignore,
	applyFilter,
  updateCurrentPage,
})
export default class List extends React.PureComponent {
	state = {
		checkedAll: false,
		checkedIds: Set(),
		sort: {}
	}

	componentDidMount() {
	 	this.props.applyFilter({ sort: DEFAULT_SORT, order: DEFAULT_ORDER, events: ImmutableList(), filters: ImmutableList() });
	}

	check = ({ errorId }) => {
		const { checkedIds } = this.state;
		const newCheckedIds = checkedIds.contains(errorId) 
			? checkedIds.remove(errorId) 
			: checkedIds.add(errorId);
		this.setState({
			checkedAll: newCheckedIds.size === this.props.list.size,
			checkedIds: newCheckedIds 
		});
	}

	checkAll = () => {
		if (this.state.checkedAll) {
			this.setState({
				checkedAll: false,
				checkedIds: Set(),
			});
		} else {
			this.setState({
				checkedAll: true,
				checkedIds: this.props.list.map(({ errorId }) => errorId).toSet(),
			});
		}
	}

	resetChecked = () => {
		this.setState({
			checkedAll: false,
			checkedIds: Set(),
		});
	}

	currentCheckedIds() {
		return this.state.checkedIds
			.intersect(this.props.list.map(({ errorId }) => errorId).toSet());
	}

	merge = () => {
		this.props.merge(currentCheckedIds().toJS()).then(this.resetChecked);
	}

	applyToAllChecked(f) {
		return Promise.all(this.currentCheckedIds().map(f).toJS()).then(this.resetChecked);
	}

	resolve = () => {
		this.applyToAllChecked(this.props.resolve);
	}

	unresolve = () => {
		this.applyToAllChecked(this.props.unresolve);
	}

	ignore = () => {
		this.applyToAllChecked(this.props.ignore);
	}

	addPage = () => this.props.updateCurrentPage(this.props.currentPage + 1)

	writeOption = (e, { name, value }) => {
		const [ sort, order ] = value.split('-');
		const sign = order === 'desc' ? -1 : 1;
		this.setState({ sort: { sort, order }})
	}

	render() {
		const {
			list,
			status,
			loading,
			ignoreLoading,
			resolveToggleLoading,
			mergeLoading,
			onFilterChange,
      currentPage,
		} = this.props;
		const {
			checkedAll,
			checkedIds,
			sort
		} = this.state;
		const someLoading = loading || ignoreLoading || resolveToggleLoading || mergeLoading;
		const currentCheckedIds = this.currentCheckedIds();
		const displayedCount = Math.min(currentPage * PER_PAGE, list.size);
		let _list = sort.sort ? list.sortBy(i => i[sort.sort]) : list;
		_list = sort.order === 'desc' ? _list.reverse() : _list;

		return (
			<div className="bg-white p-5 border-radius-3 thin-gray-border">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center" style={{ height: "36px" }}>
						<Checkbox
							className="mr-3"
							checked={ checkedAll }
							onChange={ this.checkAll }
						/>
						{ status === UNRESOLVED
							? <IconButton
									outline
									className="mr-3"
									label="Resolve"
									icon="check"
									size="small"
									loading={ resolveToggleLoading }
									onClick={ this.resolve }
									disabled={ someLoading || currentCheckedIds.size === 0}
								/>
							: <IconButton
									outline
									className="mr-3"
									label="Unresolve"
									icon="exclamation-circle"
									size="small"
									loading={ resolveToggleLoading }
									onClick={ this.unresolve }
									disabled={ someLoading || currentCheckedIds.size === 0}
								/>
						}	
						{ status !== IGNORED &&
							<IconButton
								outline
								className="mr-3"
								label="Ignore"
								icon="ban"
								size="small"
								loading={ ignoreLoading }
								onClick={ this.ignore }
								disabled={ someLoading || currentCheckedIds.size === 0}
							/>
						}							
					</div>
					<div className="flex items-center ml-6">
	          <span className="mr-2 color-gray-medium">Sort By</span>	          
						<DropdownPlain
              name="type"              
              options={ sortOptions }
              onChange={ this.writeOption }
            />
	          <Input
							style={{ width: '350px'}}
              className="input-small ml-3"
              placeholder="Filter by Name or Message"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ onFilterChange }
            />
	        </div>
				</div>
				<Divider />
				<NoContent
	        title="No Errors Found!"
	        subtext="Please try to change your search parameters."
	        icon="exclamation-circle"
	        show={ !loading && list.size === 0}
	      >
	        <Loader loading={ loading }>
	          { _list.take(displayedCount).map(e =>
	          	<>
								<ListItem
									disabled={someLoading}
									key={e.errorId}
									error={e}
									checked={ checkedIds.contains(e.errorId) }
									onCheck={ this.check }
								/>
								<Divider/>
							</>
						)}
						<LoadMoreButton
		          className="mt-3"
		          displayedCount={displayedCount}
		          totalCount={list.size}
		          onClick={this.addPage}
		        />
	        </Loader>
	      </NoContent>
			</div>
		);
	}
}