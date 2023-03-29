import React from 'react';
import { Loader, Pagination, Tooltip, Button } from 'UI';
import { connect } from 'react-redux';
import SessionItem from 'Shared/SessionItem';
import { addFilterByKeyAndValue, updateCurrentPage, applyFilter } from 'Duck/liveSearch';
import { List } from 'immutable';
import { FilterKey } from 'App/types/filter/filterType';
import Select from 'Shared/Select';
import SortOrderButton from 'Shared/SortOrderButton';
import { KEYS } from 'Types/filter/customFilter';
import { capitalize } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { fetchList as fetchMeta } from 'Duck/customField';
import AssistSearchField from 'App/components/Assist/AssistSearchField';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import cn from 'classnames';
import Session from 'App/mstore/types/session';

const PER_PAGE = 10;

interface OwnProps {}
interface ConnectProps {
  loading: boolean;
  metaListLoading: boolean;
  list: List<any>;
  filter: any;
  currentPage: number;
  metaList: any;
  sort: any;
  total: number;
  replaceTarget?: string;
  addFilterByKeyAndValue: (key: FilterKey, value: string) => void;
  updateCurrentPage: (page: number) => void;
  applyFilter: (filter: any) => void;
  onAdd: () => void;
  fetchMeta: () => void;
}

type Props = OwnProps & ConnectProps;

function AssistSessionsModal(props: Props) {
  const { assistMultiviewStore } = useStore();
  const { loading, list, metaList = [], filter, currentPage, total, onAdd, fetchMeta } = props;
  const onUserClick = () => false;
  const { filters } = filter;
  const hasUserFilter = filters.map((i: any) => i.key).includes(KEYS.USERID);

  const sortOptions = metaList
    .map((i: any) => ({
      label: capitalize(i),
      value: i,
    }))
    .toJS();

  React.useEffect(() => {
    if (total === 0) {
      reloadSessions();
    }
    fetchMeta();
  }, []);
  const reloadSessions = () => props.applyFilter({ ...filter });
  const onSortChange = ({ value }: any) => {
    props.applyFilter({ sort: value.value });
  };
  const onSessionAdd = (session: Session) => {
    if (props.replaceTarget) {
      assistMultiviewStore.replaceSession(props.replaceTarget, session);
    } else {
      assistMultiviewStore.addSession(session);
    }
    assistMultiviewStore.fetchAgentTokenInfo(session.sessionId).then(() => onAdd());
  };

  return (
    <div className="bg-gray-lightest box-shadow h-screen p-4">
      <div className="flex flex-col my-2 w-full gap-2 ">
        <div className="flex items-center gap-2 w-full">
          <Tooltip title="Refresh" placement="top" delay={200}>
            <Button
              loading={loading}
              className="mr-2"
              variant="text"
              onClick={reloadSessions}
              icon="arrow-repeat"
            />
          </Tooltip>
          <AssistSearchField />
        </div>
        <div className="flex self-end items-center gap-2" w-full>
          <span className="color-gray-medium">Sort By</span>
          <Tooltip title="No metadata available to sort" disabled={sortOptions.length > 0}>
            <div className={cn('flex items-center', { disabled: sortOptions.length === 0 })}>
              <Select
                plain
                right
                options={sortOptions}
                onChange={onSortChange}
                value={sortOptions.find((i: any) => i.value === filter.sort) || sortOptions[0]}
              />
              <SortOrderButton
                onChange={(state: any) => props.applyFilter({ order: state })}
                sortOrder={filter.order}
              />
            </div>
          </Tooltip>
        </div>
      </div>
      <LiveSessionSearch />
      <div className="my-4" />
      <Loader loading={loading}>
        <div className={'overflow-y-scroll'} style={{ maxHeight: '85vh'}}>
        {list.map((session) => (
          <React.Fragment key={session.sessionId}>
            <div
              className={cn(
                'rounded bg-white mb-2 overflow-hidden border',
                assistMultiviewStore.sessions.findIndex(
                  (s: Record<string, any>) => s.sessionId === session.sessionId
                ) !== -1
                  ? 'cursor-not-allowed opacity-60'
                  : ''
              )}
            >
              <SessionItem
                key={session.sessionId}
                session={session}
                live
                hasUserFilter={hasUserFilter}
                onUserClick={onUserClick}
                metaList={metaList}
                isDisabled={
                  assistMultiviewStore.sessions.findIndex(
                    (s: Record<string, any>) => s.sessionId === session.sessionId
                  ) !== -1
                }
                isAdd
                onClick={() => onSessionAdd(session)}
              />
            </div>
          </React.Fragment>
        ))}
        </div>
      </Loader>

      {total > PER_PAGE && (
        <div className="w-full flex items-center justify-center py-6">
          <Pagination
            page={currentPage}
            totalPages={Math.ceil(total / PER_PAGE)}
            onPageChange={(page: any) => props.updateCurrentPage(page)}
            limit={PER_PAGE}
          />
        </div>
      )}
    </div>
  );
}

export default connect(
  (state: any) => ({
    list: state.getIn(['liveSearch', 'list']),
    loading: state.getIn(['liveSearch', 'fetchList', 'loading']),
    metaListLoading: state.getIn(['customFields', 'fetchRequest', 'loading']),
    filter: state.getIn(['liveSearch', 'instance']),
    total: state.getIn(['liveSearch', 'total']),
    currentPage: state.getIn(['liveSearch', 'currentPage']),
    metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
    sort: state.getIn(['liveSearch', 'sort']),
  }),
  {
    applyFilter,
    addFilterByKeyAndValue,
    updateCurrentPage,
    fetchMeta,
  }
)(observer(AssistSessionsModal));
