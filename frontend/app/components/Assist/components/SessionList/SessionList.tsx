/* eslint-disable i18next/no-literal-string */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Loader, NoContent, Label } from 'UI';
import SessionItem from 'Shared/SessionItem';
import { useModal } from 'App/components/Modal';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';

interface Props {
  loading: boolean;
  list: any;
  session: any;
  userId: any;
}

function SessionList(props: Props) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { sessionStore } = useStore();
  const fetchLiveList = sessionStore.fetchLiveSessions;
  const session = sessionStore.current;
  const list = sessionStore.liveSessions.filter(
    (i: any) =>
      i.userId === session.userId && i.sessionId !== session.sessionId,
  );
  const loading = sessionStore.loadingLiveSessions;
  useEffect(() => {
    const params: any = {};
    if (props.session.userId) {
      params.userId = props.session.userId;
    }
    void fetchLiveList(params);
  }, []);

  return (
    <div
      className="border-r shadow h-screen overflow-y-auto"
      style={{
        backgroundColor: '#FAFAFA',
        zIndex: 999,
        width: '100%',
        minWidth: '700px',
      }}
    >
      <div className="p-4">
        <div className="text-2xl">
          {props.userId}
          &apos;s
          <span className="color-gray-medium">{t('Live Sessions')}</span>{' '}
        </div>
      </div>
      <Loader loading={loading}>
        <NoContent
          show={!loading && list.length === 0}
          title={
            <div className="flex items-center justify-center flex-col">
              <AnimatedSVG name={ICONS.NO_LIVE_SESSIONS} size={60} />
              <div className="mt-4" />
              <div className="text-center text-lg font-medium">
                {t('No live sessions found.')}
              </div>
            </div>
          }
        >
          <div className="p-4">
            {list.map((session: any) => (
              <div className="mb-6" key={session.sessionId}>
                {session.pageTitle && session.pageTitle !== '' && (
                  <div className="flex items-center mb-2">
                    <Label size="small" className="p-1">
                      <span className="color-gray-medium">{t('TAB')}</span>
                    </Label>
                    <span className="ml-2 font-medium">
                      {session.pageTitle}
                    </span>
                  </div>
                )}
                <SessionItem compact onClick={hideModal} session={session} />
              </div>
            ))}
          </div>
        </NoContent>
      </Loader>
    </div>
  );
}

export default observer(SessionList);
