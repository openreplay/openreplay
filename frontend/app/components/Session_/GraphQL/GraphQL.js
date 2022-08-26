import React from 'react';
import { NoContent, Input, SlideModal, CloseButton, Button } from 'UI';
import { getRE } from 'App/utils';
import { connectPlayer, pause, jump } from 'Player';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import GQLDetails from './GQLDetails';
import { renderStart } from 'Components/Session_/Network/NetworkContent';

function renderDefaultStatus() {
  return '2xx-3xx';
}

export function renderName(r) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <div>{r.operationName}</div>
      <Button
        variant="text"
        className="right-0 text-xs uppercase p-2 color-gray-500 hover:color-teal"
        onClick={(e) => {
          e.stopPropagation();
          jump(r.time);
        }}
      >
        Jump
      </Button>
    </div>
  );
}

@connectPlayer((state) => ({
  list: state.graphqlList,
  listNow: state.graphqlListNow,
  time: state.time,
  livePlay: state.livePlay,
}))
export default class GraphQL extends React.PureComponent {
  state = {
    filter: '',
    filteredList: this.props.list,
    filteredListNow: this.props.listNow,
    current: null,
    currentIndex: 0,
    showFetchDetails: false,
    hasNextError: false,
    hasPreviousError: false,
    lastActiveItem: 0,
  };

  static filterList(list, value) {
    const filterRE = getRE(value, 'i');

    return value
      ? list.filter(
          (r) =>
            filterRE.test(r.operationKind) ||
            filterRE.test(r.operationName) ||
            filterRE.test(r.variables)
        )
      : list;
  }

  onFilterChange = ({ target: { value } }) => {
    const { list } = this.props;
    const filtered = GraphQL.filterList(list, value);
    this.setState({ filter: value, filteredList: filtered, currentIndex: 0 });
  };

  setCurrent = (item, index) => {
    if (!this.props.livePlay) {
      pause();
      jump(item.time);
    }
    this.setState({ current: item, currentIndex: index });
  };

  closeModal = () => this.setState({ current: null, showFetchDetails: false });

  static getDerivedStateFromProps(nextProps, prevState) {
    const { list } = nextProps;
    if (nextProps.time) {
      const filtered = GraphQL.filterList(list, prevState.filter);
      console.log({
        list,
        filtered,
        time: nextProps.time,
      });

      let i = 0;
      filtered.forEach((item, index) => {
        if (item.time <= nextProps.time) {
          i = index;
        }
      });

      return {
        lastActiveItem: i,
      };
    }
  }

  render() {
    const { current, currentIndex, filteredList, lastActiveItem } = this.state;

    return (
      <React.Fragment>
        <SlideModal
          size="middle"
          right
          title={
            <div className="flex justify-between">
              <h1>GraphQL</h1>
              <div className="flex items-center">
                <CloseButton onClick={this.closeModal} size="18" className="ml-2" />
              </div>
            </div>
          }
          isDisplayed={current != null}
          content={
            current && (
              <GQLDetails
                gql={current}
                nextClick={this.nextClickHander}
                prevClick={this.prevClickHander}
                first={currentIndex === 0}
                last={currentIndex === filteredList.length - 1}
              />
            )
          }
          onClose={this.closeModal}
        />
        <BottomBlock>
          <BottomBlock.Header>
            <span className="font-semibold color-gray-medium mr-4">GraphQL</span>
            <div className="flex items-center">
              <Input
                // className="input-small"
                placeholder="Filter by name or type"
                icon="search"
                iconPosition="left"
                name="filter"
                onChange={this.onFilterChange}
              />
            </div>
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent size="small" title="No recordings found" show={filteredList.length === 0}>
              <TimeTable
                rows={filteredList}
                onRowClick={this.setCurrent}
                hoverable
                activeIndex={lastActiveItem}
              >
                {[
                  {
                    label: 'Start',
                    width: 90,
                    render: renderStart,
                  },
                  {
                    label: 'Status',
                    width: 70,
                    render: renderDefaultStatus,
                  },
                  {
                    label: 'Type',
                    dataKey: 'operationKind',
                    width: 60,
                  },
                  {
                    label: 'Name',
                    width: 240,
                    render: renderName,
                  },
                ]}
              </TimeTable>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </React.Fragment>
    );
  }
}
