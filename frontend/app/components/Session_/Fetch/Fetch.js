
import { getRE } from 'App/utils';
import { Label, NoContent, Input, SlideModal, CloseButton } from 'UI';
import { connectPlayer, pause, jump } from 'Player';
// import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import FetchDetails from './FetchDetails';
import { renderName, renderDuration } from '../Network';
import { connect } from 'react-redux';
import { setTimelinePointer } from 'Duck/sessions';

@connectPlayer(state => ({
  list: state.fetchList,
}))
@connect(state => ({
  timelinePointer: state.getIn(['sessions', 'timelinePointer']),
}), { setTimelinePointer })
export default class Fetch extends React.PureComponent {
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
    pause()
    jump(item.time)
    this.setState({ current: item, currentIndex: index });
  }

  onRowClick = (item, index) => {
    pause()
    this.setState({ current: item, currentIndex: index, showFetchDetails: true });
    this.props.setTimelinePointer(null);
  }

  closeModal = () => this.setState({ current: null, showFetchDetails: false });

  nextClickHander = () => {
    // const { list } = this.props;
    const { currentIndex, filteredList } = this.state;
    
    if (currentIndex === filteredList.length  - 1) return;
    const newIndex = currentIndex + 1;
    this.setCurrent(filteredList[newIndex], newIndex);
    this.setState({ showFetchDetails: true });
  }

  prevClickHander = () => {
    // const { list } = this.props;
    const { currentIndex, filteredList } = this.state;

    if (currentIndex === 0) return;
    const newIndex = currentIndex - 1;
    this.setCurrent(filteredList[newIndex], newIndex);
    this.setState({ showFetchDetails: true });
  }

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
    // const { list } = this.props;
    const { current, currentIndex, showFetchDetails, filteredList } = this.state;
    return (
      <React.Fragment>
        <SlideModal
          right 
          size="middle"
          title={
            <div className="flex justify-between">
              <h1>Fetch Request</h1>
              <div className="flex items-center">
                <div className="flex items-center">
                  <span className="mr-2 color-gray-medium uppercase text-base">Status</span>
                  <Label
                    data-red={current && current.status >= 400}
                    data-green={current && current.status < 400}
                  >
                    <div className="uppercase w-16 justify-center code-font text-lg">{current && current.status}</div>
                  </Label>
                </div>
                <CloseButton onClick={ this.closeModal } size="18" className="ml-2" />
              </div>
            </div>
          }
          isDisplayed={ current != null && showFetchDetails }
          content={ current && showFetchDetails && 
            <FetchDetails
              resource={ current }
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
            <h4 className="text-lg">Fetch</h4>
            <div className="flex items-center">
              {/* <div className="flex items-center mr-3 text-sm uppercase">
                <div className="p-2 cursor-pointer" onClick={this.goToPrevError}>Prev</div>
                <div className="p-2 cursor-pointer" onClick={this.goToNextError}>Next</div>
              </div> */}
              <Input
                className="input-small"
                placeholder="Filter"
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
                onRowClick={ this.onRowClick }
                hoverable
                navigation
                activeIndex={currentIndex}
              >
                {[
                  {
                    label: "Status",
                    dataKey: 'status',
                    width: 70,
                  }, {
                    label: "Method",
                    dataKey: "method",
                    width: 60,
                  }, {
                    label: "Name",
                    width: 180,
                    render: renderName,
                  },
                  {
                    label: "Time",
                    width: 80,
                    render: renderDuration,
                  }
                ]}
              </TimeTable>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </React.Fragment>
    );
  }
}
