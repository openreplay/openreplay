import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { setAutoplayValues } from 'Duck/sessions';
import { withSiteId, session as sessionRoute } from 'App/routes';
import { Link, Icon, Tooltip } from 'UI';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';
import { fetchAutoplaySessions } from 'Duck/search';

const PER_PAGE = 10;

interface Props extends RouteComponentProps {
  siteId: string;
  previousId: string;
  nextId: string;
  defaultList: any;
  currentPage: number;
  total: number;
  setAutoplayValues: () => void;
  latestRequestTime: any;
  sessionIds: any;
  fetchAutoplaySessions: (page: number) => Promise<void>;
}
function QueueControls(props: Props) {
  const {
    siteId,
    previousId,
    nextId,
    currentPage,
    total,
    sessionIds,
    latestRequestTime,
    match: {
      // @ts-ignore
      params: { sessionId },
    },
  } = props;

  const disabled = sessionIds.length === 0;

  useEffect(() => {
    if (latestRequestTime) {
      props.setAutoplayValues();
      const totalPages = Math.ceil(total / PER_PAGE);
      const index = sessionIds.indexOf(sessionId);

      // check for the last page and load the next
      if (currentPage !== totalPages && index === sessionIds.length - 1) {
        props.fetchAutoplaySessions(currentPage + 1).then(props.setAutoplayValues);
      }
    }
  }, []);

  const nextHandler = () => {
    props.history.push(withSiteId(sessionRoute(nextId), siteId));
  };

  const prevHandler = () => {
    props.history.push(withSiteId(sessionRoute(previousId), siteId));
  };

  return (
    <div className="flex items-center">
      <div
        onClick={prevHandler}
        className={cn('p-1 bg-gray-bg group rounded-full color-gray-darkest font-medium', {
          'pointer-events-none opacity-50': !previousId,
          'cursor-pointer': !!previousId,
        })}
      >
        <Tooltip
          placement="bottom"
          title={<div className="whitespace-nowrap">Play Previous Session</div>}
          disabled={!previousId}
        >
          <Icon name="prev1" className="group-hover:fill-main" color="inherit" size="16" />
        </Tooltip>
      </div>
      <div
        onClick={nextHandler}
        className={cn('p-1 bg-gray-bg group ml-1 rounded-full color-gray-darkest font-medium', {
          'pointer-events-none opacity-50': !nextId,
          'cursor-pointer': !!nextId,
        })}
      >
        <Tooltip
          placement="bottom"
          title={<div className="whitespace-nowrap">Play Next Session</div>}
          disabled={!nextId}
        >
          <Icon name="next1" className="group-hover:fill-main" color="inherit" size="16" />
        </Tooltip>
      </div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    previousId: state.getIn(['sessions', 'previousId']),
    nextId: state.getIn(['sessions', 'nextId']),
    currentPage: state.getIn(['search', 'currentPage']) || 1,
    total: state.getIn(['sessions', 'total']) || 0,
    sessionIds: state.getIn(['sessions', 'sessionIds']) || [],
    latestRequestTime: state.getIn(['search', 'latestRequestTime']),
    siteId: state.getIn(['site', 'siteId']),
  }),
  { setAutoplayValues, fetchAutoplaySessions }
)(withRouter(QueueControls));
