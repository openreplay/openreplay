import React from 'react';
import { connect } from 'react-redux';
import { getRE } from 'App/utils';
import {
  NoContent,
  Loader,
  Input,
  ErrorItem,
  SlideModal,
  ErrorDetails,
  Link,
  QuestionMarkHint,
} from 'UI';
import { error as errorRoute } from 'App/routes';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import { MobilePlayerContext, PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface IProps {
  loading: boolean;
  sourcemapUploaded: boolean;
  errorStack: Record<string, any>;
}

function MobileExceptionsCont() {
  const { player, store } = React.useContext(MobilePlayerContext);
  const { exceptionsList: exceptions = [] } = store.get();
  const [filter, setFilter] = React.useState('');

  const onFilterChange = ({ target: { value } }: any) => setFilter(value);

  const filterRE = getRE(filter, 'i');
  const filtered = exceptions.filter((e: any) => filterRE.test(e.name) || filterRE.test(e.message));

  return (
    <>
      <BottomBlock>
        <BottomBlock.Header>
          <div className="flex items-center">
            <span className="font-semibold color-gray-medium mr-4">Exceptions</span>
          </div>

          <div className={'flex items-center justify-between'}>
            <Input
              className="input-small"
              placeholder="Filter by name or message"
              icon="search"
              name="filter"
              onChange={onFilterChange}
              height={28}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent size="small" show={filtered.length === 0} title="No recordings found">
            <Autoscroll>
              {filtered.map((e: any, index) => (
                <React.Fragment key={e.key}>
                  <ErrorItem onJump={() => player.jump(e.time)} error={e} />
                </React.Fragment>
              ))}
            </Autoscroll>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </>
  );
}

function ExceptionsCont({ errorStack, sourcemapUploaded, loading }: IProps) {
  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();
  const { logListNow: logs = [], exceptionsList: exceptions = [] } = tabStates[currentTab]
  const [filter, setFilter] = React.useState('');
  const [currentError, setCurrentErrorVal] = React.useState(null);

  const onFilterChange = ({ target: { value } }: any) => setFilter(value);
  const closeModal = () => setCurrentErrorVal(null);

  const filterRE = getRE(filter, 'i');
  const filtered = exceptions.filter((e: any) => filterRE.test(e.name) || filterRE.test(e.message));

  return (
    <>
      <SlideModal
        title={
          currentError && (
            <div className="mb-4">
              <div className="text-xl mb-2">
                <Link to={errorRoute(currentError.errorId)}>
                  <span className="font-bold">{currentError.name}</span>
                </Link>
                <span className="ml-2 text-sm color-gray-medium">{currentError.function}</span>
              </div>
              <div>{currentError.message}</div>
            </div>
          )
        }
        isDisplayed={currentError != null}
        content={
          currentError && (
            <div className="px-4">
              <Loader loading={loading}>
                <NoContent show={!loading && errorStack.size === 0} title="Nothing found!">
                  <ErrorDetails
                    error={currentError}
                    // @ts-ignore
                    errorStack={errorStack}
                    sourcemapUploaded={sourcemapUploaded}
                  />
                </NoContent>
              </Loader>
            </div>
          )
        }
        onClose={closeModal}
      />
      <BottomBlock>
        <BottomBlock.Header>
          <div className="flex items-center">
            <span className="font-semibold color-gray-medium mr-4">Exceptions</span>
          </div>

          <div className={'flex items-center justify-between'}>
            <Input
              className="input-small"
              placeholder="Filter by name or message"
              icon="search"
              name="filter"
              onChange={onFilterChange}
              height={28}
            />
            <QuestionMarkHint
              className={'mx-4'}
              content={
                <>
                  <a
                    className="color-teal underline"
                    target="_blank"
                    href="https://docs.openreplay.com/installation/upload-sourcemaps"
                  >
                    Upload Source Maps{' '}
                  </a>
                  and see source code context obtained from stack traces in their original form.
                </>
              }
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent size="small" show={filtered.length === 0} title="No recordings found">
            <Autoscroll>
              {filtered.map((e: any, index) => (
                <React.Fragment key={e.key}>
                  <ErrorItem onJump={() => player.jump(e.time)} error={e} />
                </React.Fragment>
              ))}
            </Autoscroll>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </>
  );
}

export const Exceptions = connect((state: any) => ({
  errorStack: state.getIn(['sessions', 'errorStack']),
  sourcemapUploaded: state.getIn(['sessions', 'sourcemapUploaded']),
  loading: state.getIn(['sessions', 'fetchErrorStackList', 'loading']),
}))(observer(ExceptionsCont));

export const MobileExceptions = observer(MobileExceptionsCont)