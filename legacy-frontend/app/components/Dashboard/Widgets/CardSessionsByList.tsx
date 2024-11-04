import React from 'react';
import { Avatar, List, Progress, Typography } from 'antd';
import cn from 'classnames';

interface Props {
  list: any;
  selected?: any;
  onClickHandler?: (event: any, data: any) => void;
}

function CardSessionsByList({ list, selected, onClickHandler = () => null }: Props) {
  return (
    <List
      dataSource={list}
      split={false}
      renderItem={(row: any, index: number) => (
        <List.Item
          key={row.name}
          onClick={(e) => onClickHandler(e, row)}
          style={{
            borderBottom: index === list.length - 1 ? 'none' : '1px dotted rgba(0, 0, 0, 0.05)',
            padding: '4px 10px',
            lineHeight: '1px'
          }}
          className={cn('rounded', selected === row.name ? 'bg-active-blue' : '')}
        >
          <List.Item.Meta
            className="m-0"
            avatar={<Avatar src={row.icon} />}
            title={(
              <div className="m-0">
                <div className="flex justify-between m-0 p-0">
                  <Typography.Text>{row.displayName}</Typography.Text>
                  <Typography.Text type="secondary"> {row.sessionCount}</Typography.Text>
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
  );
}

export default CardSessionsByList;
