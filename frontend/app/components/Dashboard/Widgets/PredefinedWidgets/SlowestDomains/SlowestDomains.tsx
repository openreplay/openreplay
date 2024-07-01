import React from 'react';
import { Icon, NoContent } from 'UI';
import { Styles } from '../../common';
import { numberWithCommas } from 'App/utils';
import Bar from './Bar';
import { NO_METRIC_DATA } from 'App/constants/messages';
import CardSessionsByList from 'Components/Dashboard/Widgets/CardSessionsByList';
import { List, Progress, Typography } from 'antd';
import cn from 'classnames';

interface Props {
  data: any;
}

function SlowestDomains(props: Props) {
  const { data } = props;
  // TODO - move this to the store
  const highest = data.chart[0].value;
  const list = data.chart.slice(0, 4).map((item: any) => ({
    name: item.domain,
    icon: <Icon name="link-45deg" size={24} />,
    value: Math.round(item.value) + 'ms',
    progress: Math.round((item.value * 100) / highest)
  }));

  return (
    <NoContent
      size="small"
      show={list.length === 0}
      style={{ minHeight: 220 }}
      title={NO_METRIC_DATA}
    >
      <div className="w-full" style={{ height: '240px' }}>
        <List
          dataSource={list}
          split={false}
          renderItem={(row: any) => (
            <List.Item
              key={row.domain}
              // onClick={(e) => onClickHandler(e, row)} // Remove onClick handler to disable click interaction
              style={{
                borderBottom: '1px dotted rgba(0, 0, 0, 0.05)',
                padding: '4px 10px',
                lineHeight: '1px'
              }}
              className={cn('rounded')} // Remove hover:bg-active-blue and cursor-pointer
            >
              <List.Item.Meta
                className="m-0"
                avatar={row.icon ? row.icon : null}
                title={(
                  <div className="m-0">
                    <div className="flex justify-between m-0 p-0">
                      <Typography.Text>{row.name}</Typography.Text>
                      <Typography.Text type="secondary"> {row.value}</Typography.Text>
                    </div>

                    <Progress
                      percent={row.progress}
                      showInfo={false}
                      strokeColor={{
                        '0%': '#394EFF',
                        '100%': '#394EFF'
                      }}
                      size={['small', 2]}
                      style={{
                        padding: '0 0px',
                        margin: '0 0px',
                        height: 4
                      }}
                    />
                  </div>
                )}
              />
            </List.Item>
          )}
        />
      </div>
    </NoContent>
  );
}

export default SlowestDomains;
