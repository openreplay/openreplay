import { QuestionMarkHint } from '@/ui/overlays/QuestionMarkHint';
import { CircleAlert } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { getRE } from 'App/utils';

import JumpButton from 'Shared/DevTools/JumpButton';
import { Keyword, NoData } from 'Shared/DevTools/PanelKit';

import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';

const DOCS = 'https://docs.openreplay.com/deployment/upload-sourcemaps';

function ExceptionRow({ error, onJump }: { error: any; onJump: () => void }) {
  const { showModal } = useModal();
  return (
    <div
      className="m-dt__row m-dt__log is-error has-tail group"
      onClick={() =>
        showModal(<ErrorDetailsModal errorId={error.errorId} />, {
          right: true,
          size: 'wide',
        })
      }
    >
      <span className="m-dt__rowopen is-empty" aria-hidden="true" />
      <CircleAlert
        size={12}
        className="m-dt__level is-error"
        aria-hidden="true"
      />
      <span className="m-dt__logtext m-mono">
        {error.name}
        {error.stack0InfoString && (
          <span className="m-dt__logmsg"> {error.stack0InfoString}</span>
        )}
        {error.message && (
          <span className="m-dt__logmsg block">{error.message}</span>
        )}
      </span>
      <JumpButton onClick={onJump} time={error.time} />
    </div>
  );
}

function ExceptionsList({
  exceptions,
  jump,
  hint,
}: {
  exceptions: any[];
  jump: (t: number) => void;
  hint?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState('');
  const filterRE = getRE(filter, 'i');
  const filtered = exceptions.filter(
    (e: any) => filterRE.test(e.name) || filterRE.test(e.message),
  );

  return (
    <BottomBlock>
      <BottomBlock.Header>
        <span />
        <div className="m-dt__bar-right">
          <Keyword
            value={filter}
            onChange={setFilter}
            placeholder={t('Filter by name or message')}
          />
          {hint}
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filtered.length === 0 ? (
          <NoData
            hint={
              filter
                ? t('No exception matches that.')
                : t('No exceptions in this session.')
            }
          />
        ) : (
          <Autoscroll>
            {filtered.map((e: any) => (
              <ExceptionRow key={e.key} error={e} onJump={() => jump(e.time)} />
            ))}
          </Autoscroll>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

function MobileExceptionsCont() {
  const { player, store } = React.useContext(MobilePlayerContext);
  const { exceptionsList: exceptions = [] } = store.get();
  return (
    <ExceptionsList exceptions={exceptions} jump={(t) => player.jump(t)} />
  );
}

function ExceptionsCont() {
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();
  const { exceptionsList: exceptions = [] } = tabStates[currentTab];
  return (
    <ExceptionsList
      exceptions={exceptions}
      jump={(time) => player.jump(time)}
      hint={
        <QuestionMarkHint
          content={
            <>
              <a href={DOCS} target="_blank" rel="noreferrer">
                {t('Upload source maps')}
              </a>{' '}
              {t('to see stack traces in their original form.')}
            </>
          }
        />
      }
    />
  );
}

export const Exceptions = observer(ExceptionsCont);

export const MobileExceptions = observer(MobileExceptionsCont);
