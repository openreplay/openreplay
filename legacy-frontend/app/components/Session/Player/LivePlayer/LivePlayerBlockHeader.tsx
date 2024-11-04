import React from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  assist as assistRoute,
  withSiteId,
  multiview,
} from 'App/routes';
import { BackLink, Icon } from 'UI';
import cn from 'classnames';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import UserCard from '../ReplayPlayer/EventsBlock/UserCard';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore'
import stl from '../ReplayPlayer/playerBlockHeader.module.css';
import AssistActions from 'Components/Assist/components/AssistActions';

const ASSIST_ROUTE = assistRoute();

// TODO props
function LivePlayerBlockHeader(props: any) {
  const [hideBack, setHideBack] = React.useState(false);
  const { store } = React.useContext(PlayerContext);
  const { assistMultiviewStore } = useStore();
  const history = useHistory();
  const { width, height } = store.get();

  const {
    session,
    metaList,
    closedLive = false,
    siteId,
    isMultiview,
  } = props;

  React.useEffect(() => {
    const queryParams = new URLSearchParams(document.location.search);
    setHideBack(queryParams.has('iframe') && queryParams.get('iframe') === 'true');
  }, []);

  const backHandler = () => {
    history.goBack();
    // history.push(withSiteId(ASSIST_ROUTE, siteId));
  };

  const { userId, metadata, isCallActive, agentIds } = session;
  let _metaList = Object.keys(metadata)
    .filter((i) => metaList.includes(i))
    .map((key) => {
      const value = metadata[key];
      return { label: key, value };
    });

  const openGrid = () => {
    const sessionIdQuery = encodeURIComponent(assistMultiviewStore.sessions.map((s) => s?.sessionId).join(','));
    return history.push(withSiteId(multiview(sessionIdQuery), siteId));
  };

  return (
    <div className={cn(stl.header, 'flex justify-between')}>
      <div className="flex w-full items-center">
        {!hideBack && (
          <div
            className="flex items-center h-full cursor-pointer group"
            onClick={() => (assistMultiviewStore.sessions.length > 1 || isMultiview ? openGrid() : backHandler())}
          >
            {assistMultiviewStore.sessions.length > 1 || isMultiview ? (
              <>
                <div className="rounded-full border group-hover:border-teal group-hover:text-teal group-hover:fill-teal p-1 mr-2">
                  <Icon name="close" color="inherit" size={13} />
                </div>
                <span className="group-hover:text-teal group-hover:fill-teal">
                  Close
                </span>
                <div className={stl.divider} />
              </>
            ) : (
              <>
                {/* @ts-ignore TODO */}
                <BackLink label="Back" className="h-full" />
                <div className={stl.divider} />
              </>
            )}
          </div>
        )}
        <UserCard className="" width={width} height={height} />

        <div className={cn('ml-auto flex items-center h-full', { hidden: closedLive })}>
          {_metaList.length > 0 && (
            <div className="border-l h-full flex items-center px-2">
              <SessionMetaList className="" metaList={_metaList} maxLength={2} />
            </div>
          )}

            <AssistActions userId={userId} isCallActive={isCallActive} agentIds={agentIds} />
        </div>
      </div>
    </div>
  );
}

const PlayerHeaderCont = connect(
  (state: any) => {
    const isAssist = window.location.pathname.includes('/assist/');
    const session = state.getIn(['sessions', 'current']);

    return {
      isAssist,
      session,
      sessionPath: state.getIn(['sessions', 'sessionPath']),
      siteId: state.getIn(['site', 'siteId']),
      metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
      closedLive: !!state.getIn(['sessions', 'errors']) || (isAssist && !session.live),
    };
  }
)(observer(LivePlayerBlockHeader));

export default PlayerHeaderCont;
