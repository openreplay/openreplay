import { connect } from 'react-redux';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import { errors as errorsRoute, error as errorRoute } from 'App/routes';
import { NoContent , Loader, IconButton, Icon, Popup, BackLink, } from 'UI';
import { fetch, fetchTrace } from 'Duck/errors';
import MainSection from './MainSection';
import SideSection from './SideSection';

@connect(state =>({
	errorIdInStore: state.getIn(["errors", "instance"]).errorId,
	loading: state.getIn([ "errors", "fetch", "loading" ]) || state.getIn([ "errors", "fetchTrace", "loading" ]),
	errorOnFetch: state.getIn(["errors", "fetch", "errors"]) || state.getIn([ "errors", "fetchTrace", "errors" ]),
}), {
	fetch,
	fetchTrace,
})
@withSiteIdRouter
export default class ErrorInfo extends React.PureComponent {
	ensureInstance() {
		const { errorId, loading, errorOnFetch } = this.props;
		if (!loading && !errorOnFetch && 
				this.props.errorIdInStore !== errorId && 
				errorId != null) {
			this.props.fetch(errorId);
			this.props.fetchTrace(errorId)
		}
	}
	componentDidMount() {
		this.ensureInstance();
	}
	componentDidUpdate() {
		this.ensureInstance();
	}
	next = () => {
		const { list, errorId } = this.props;
		const curIndex = list.findIndex(e => e.errorId === errorId);
		const next = list.get(curIndex + 1);
		if (next != null) {
			this.props.history.push(errorRoute(next.errorId))
		}
	}
	prev = () => {
		const { list, errorId } = this.props;
		const curIndex = list.findIndex(e => e.errorId === errorId);
		const prev = list.get(curIndex - 1);
		if (prev != null) {
			this.props.history.push(errorRoute(prev.errorId))
		}
		
	}
	render() {
		const { 
			loading,
			errorIdInStore,
			list,
			errorId,
		} = this.props;

		let nextDisabled = true,
				prevDisabled = true;
		if (list.size > 0) {
			nextDisabled = loading || list.last().errorId === errorId;
			prevDisabled = loading || list.first().errorId === errorId;
		}

		return (
			<NoContent
        title="No Error Found!"
        subtext="Please try to find existing one."
        icon="exclamation-circle"
        show={ !loading && errorIdInStore == null }
      >
				<div className="w-9/12 mb-4 flex justify-between">
					<BackLink	to={ errorsRoute() } label="Back" />
					<div className="flex items-center">
						<Popup
							pinned
							position="bottom center"
							inverted
							trigger={
								<IconButton
									// className="mr-3"
									outline
									compact
									size="small"
									icon="prev1"
									disabled={ prevDisabled }
									onClick={this.prev}
								/>
							}
							content="Prev Error"
						/>
						<div className="mr-3" />

						<Popup
							pinned
							inverted
							position="bottom center"
							trigger={
								<IconButton
									outline
									compact
									size="small"
									icon="next1"
									disabled={ nextDisabled }
									onClick={this.next}
								/>
							}
							content="Next Error"
						/>
					</div>
				</div>
				<div className="flex" >
						<Loader loading={ loading } className="w-9/12">
							<MainSection className="w-9/12" />
							<SideSection className="w-3/12" />
						</Loader>
				</div>
			</NoContent>
		);
	}
} 