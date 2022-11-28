import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { setAutoplayValues } from 'Duck/sessions';
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, Tooltip } from 'UI';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';
import { fetchAutoplaySessions } from 'Duck/search';

const PER_PAGE = 10;

interface Props extends RouteComponentProps {
  previousId: string;
  nextId: string;
  defaultList: any;
  currentPage: number;
  total: number;
  setAutoplayValues?: () => void;
  latestRequestTime: any;
  sessionIds: any;
  fetchAutoplaySessions?: (page: number) => Promise<void>;
}
function Autoplay(props: Props) {
  const {
    previousId,
    nextId,
    currentPage,
    total,
    sessionIds,
    latestRequestTime,
    match: {
      // @ts-ignore
      params: { siteId, sessionId },
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

  return (
    <div className="flex items-center">
      <Tooltip
        placement="bottom"
        title={<div className="whitespace-nowrap">Play Previous Session</div>}
        disabled={!previousId}
      >
        <Link to={sessionRoute(previousId)} disabled={!previousId}>
          <div
            className={cn(
              'p-1 bg-gray-bg group rounded-full color-gray-darkest font-medium',
              previousId && 'cursor-pointer',
              !disabled && nextId && 'hover:bg-bg-blue'
            )}
          >
            <Icon name="prev1" className="group-hover:fill-main" color="inherit" size="16" />
          </div>
        </Link>
      </Tooltip>

      <Tooltip
        placement="bottom"
        title={<div className="whitespace-nowrap">Play Next Session</div>}
        disabled={!nextId}
      >
        <Link to={sessionRoute(nextId)} disabled={!nextId}>
          <div
            className={cn(
              'p-1 bg-gray-bg group ml-1 rounded-full color-gray-darkest font-medium',
              nextId && 'cursor-pointer',
              !disabled && nextId && 'hover:bg-bg-blue'
            )}
          >
            <Icon name="next1" className="group-hover:fill-main" color="inherit" size="16" />
          </div>
        </Link>
      </Tooltip>
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
  }),
  { setAutoplayValues, fetchAutoplaySessions }
)(withRouter(Autoplay));
