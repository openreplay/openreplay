import React from 'react';
import { connect } from 'react-redux';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import { error as errorRoute } from 'App/routes';
import { NoContent, Loader } from 'UI';
import { fetch, fetchTrace } from 'Duck/errors';
import MainSection from './MainSection';
import SideSection from './SideSection';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

@connect(
  (state) => ({
    errorIdInStore: state.getIn(['errors', 'instance']).errorId,
    list: state.getIn(['errors', 'instanceTrace']),
    loading:
      state.getIn(['errors', 'fetch', 'loading']) ||
      state.getIn(['errors', 'fetchTrace', 'loading']),
    errorOnFetch:
      state.getIn(['errors', 'fetch', 'errors']) || state.getIn(['errors', 'fetchTrace', 'errors']),
  }),
  {
    fetch,
    fetchTrace,
  }
)
@withSiteIdRouter
export default class ErrorInfo extends React.PureComponent {
  ensureInstance() {
    const { errorId, loading, errorOnFetch } = this.props;
    if (!loading && this.props.errorIdInStore !== errorId && errorId != null) {
      this.props.fetch(errorId);
      this.props.fetchTrace(errorId);
    }
  }
  componentDidMount() {
    this.ensureInstance();
  }
  componentDidUpdate(prevProps) {
    if (prevProps.errorId !== this.props.errorId || prevProps.errorIdInStore !== this.props.errorIdInStore) {
      this.ensureInstance();
    }
  }
  next = () => {
    const { list, errorId } = this.props;
    const curIndex = list.findIndex((e) => e.errorId === errorId);
    const next = list.get(curIndex + 1);
    if (next != null) {
      this.props.history.push(errorRoute(next.errorId));
    }
  };
  prev = () => {
    const { list, errorId } = this.props;
    const curIndex = list.findIndex((e) => e.errorId === errorId);
    const prev = list.get(curIndex - 1);
    if (prev != null) {
      this.props.history.push(errorRoute(prev.errorId));
    }
  };
  render() {
    const { loading, errorIdInStore, list, errorId } = this.props;

    let nextDisabled = true,
      prevDisabled = true;
    if (list.size > 0) {
      nextDisabled = loading || list.last().errorId === errorId;
      prevDisabled = loading || list.first().errorId === errorId;
    }

    return (
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
            <div className="mt-4">No Error Found!</div>
          </div>
        }
        subtext="Please try to find existing one."
        show={!loading && errorIdInStore == null}
      >
        <div className="flex w-full">
          <Loader loading={loading} className="w-full">
            <MainSection className="w-9/12" />
            <SideSection className="w-3/12" />
          </Loader>
        </div>
      </NoContent>
    );
  }
}
