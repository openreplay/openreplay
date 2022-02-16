import { Label, Icon, NoContent, Input, SlideModal, CloseButton } from 'UI';
import { getRE } from 'App/utils';
import { connectPlayer, pause, jump } from 'Player';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import GQLDetails from './GQLDetails';

function renderDefaultStatus() {
  return "2xx-3xx";
}
@connectPlayer(state => ({
  list: state.graphqlListNow,
  livePlay: state.livePlay,
}))
export default class GraphQL extends React.PureComponent {
	state = {
    filter: "",
    filteredList: this.props.list,
		current: null,
    currentIndex: 0,
    showFetchDetails: false,
    hasNextError: false,
    hasPreviousError: false,
	}

  onFilterChange = (e, { value }) => {
    const { list } = this.props;
    const filterRE = getRE(value, 'i');
    const filtered = list
      .filter((r) => filterRE.test(r.name) || filterRE.test(r.url) || filterRE.test(r.method) || filterRE.test(r.status));
    this.setState({ filter: value, filteredList: value ? filtered : list, currentIndex: 0 });
  }

  setCurrent = (item, index) => {
    if (!this.props.livePlay) {
      pause();
      jump(item.time)
    }
    this.setState({ current: item, currentIndex: index });
  }

  closeModal = () => this.setState({ current: null, showFetchDetails: false });

  static getDerivedStateFromProps(nextProps, prevState) {
    const { filteredList } = prevState;
    if (nextProps.timelinePointer) {
      let activeItem = filteredList.find((r) => r.time >= nextProps.timelinePointer.time);
      activeItem = activeItem || filteredList[filteredList.length - 1];
      return {
        current: activeItem,
        currentIndex: filteredList.indexOf(activeItem),
      };
    }
  }

  render() {
    const { list } = this.props;
    const { current, currentIndex, filteredList } = this.state;
    
    return (
      <React.Fragment>
        <SlideModal 
          size="middle"
          right
          title = {
            <div className="flex justify-between">
              <h1>GraphQL</h1>
              <div className="flex items-center">
                <CloseButton onClick={ this.closeModal } size="18" className="ml-2" />
              </div>
            </div>
          }
          isDisplayed={ current != null }
          content={ current && 
            <GQLDetails
              gql={ current }
              nextClick={this.nextClickHander}
              prevClick={this.prevClickHander}
              first={currentIndex === 0}
              last={currentIndex === filteredList.length - 1}
            />
          }
          onClose={ this.closeModal }
        />
        <BottomBlock>
          <BottomBlock.Header>
            <h4 className="text-lg">GraphQL</h4>
            <div className="flex items-center">
              <Input
                className="input-small"
                placeholder="Filter by Name or Type"
                icon="search"
                iconPosition="left"
                name="filter"
                onChange={ this.onFilterChange }
              />
            </div>
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent
              size="small"
              show={ filteredList.length === 0}
            >
              <TimeTable
                rows={ filteredList }
                onRowClick={ this.setCurrent }
                hoverable
                navigation
                activeIndex={currentIndex}
              >
                {[
                  {
                    label: "Status",
                    width: 70,
                    render: renderDefaultStatus,
                  }, {
                    label: "Type",
                    dataKey: "operationKind",
                    width: 60,
                  }, {
                    label: "Name",
                    width: 130,
                    dataKey: "operationName",
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
