import React from 'react';
import { NoContent, Input, QuestionMarkHint } from 'UI'
import { getRE } from 'App/utils';
import { connectPlayer, jump } from 'Player';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';


const CONTEXTS = [ "unknown", "self", "same-origin-ancestor", "same-origin-descendant", "same-origin", "cross-origin-ancestor", "cross-origin-descendant", "cross-origin-unreachable", "multiple-contexts" ];
const CONTAINER_TYPES = [ "window", "iframe", "embed", "object" ];

function renderContext({ context }) {
  return CONTEXTS[ context ];
}

function renderDuration({ duration }) {
  return `${ duration }ms`;
}

function renderContainerType({ containerType }) {
  return CONTAINER_TYPES[ containerType ]
}

@connectPlayer(state => ({
  list: state.longtasksList,
  time: state.time,
}))
export default class GraphQL extends React.PureComponent {
  state = {
    filter: "",
  }
  onFilterChange = ({ target: { value } }) => this.setState({ filter: value })

  jump = ({ time }) => {
    jump(time);
  }

  render() {
    const { list, time} = this.props;
    const { filter, current } = this.state;
    const filterRE = getRE(filter, 'i');
    const filtered = list
      .filter(({ containerType, context, containerName = "", containerId = "", containerSrc="" }) => 
          filterRE.test(containerName) || 
          filterRE.test(containerId) ||
          filterRE.test(containerSrc) ||
          filterRE.test(CONTEXTS[ context ]) ||
          filterRE.test(CONTAINER_TYPES[ containerType ]));    
    const lastIndex = filtered.filter(item => item.time <= time).length - 1;
    return (
      <BottomBlock>
        <BottomBlock.Header>
          <span className="font-semibold color-gray-medium mr-4">Long Tasks</span>
          <div className="flex items-center">
            <Input
              className="input-small mr-3"
              style={{ width: "350px" }}
              placeholder="Filter by Context or Container Type/Id/Src"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ this.onFilterChange }
            />
            <QuestionMarkHint
              content={
                <>
                  <a className="color-teal underline mr-2" target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API">Learn more </a> 
                  about Long Tasks API
                </>
              }
              // className="mr-4"
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent
            size="small"
            title="No recordings found"
            show={ filtered.length === 0}
          >
            <TimeTable
              rows={ filtered }
              onRowClick={ this.jump }
              hoverable
              activeIndex={lastIndex}
            >
              {[
                {
                  label: "Context",
                  render: renderContext,
                  width: 140,
                }, {
                  label: "Container Type",
                  width: 110,
                  render: renderContainerType,
                },
                // {
                //   label: "ID",
                //   width: 70,
                //   dataKey: "containerId"
                // }, {
                //   label: "Name",
                //   width: 70,
                //   dataKey: "containerName"
                // }, {
                //   label: "SRC",
                //   width: 70,
                //   dataKey: "containerSrc"
                // },
                {
                  label: "Duration",
                  width: 100,
                  render: renderDuration,
                }
              ]}
            </TimeTable>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    );
  }
}
