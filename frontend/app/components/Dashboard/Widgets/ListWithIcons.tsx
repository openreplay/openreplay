import React from 'react';
import { List, Progress, Typography } from 'antd';
import cn from 'classnames';

interface ListItem {
  icon?: any;
  title: string;
  progress: number;
  value?: number;
}

interface Props {
  list: ListItem[];
}

function ListWithIcons({ list = [] }: Props) {
  return (
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
            lineHeight: '1px',
          }}
          className={cn('rounded')} // Remove hover:bg-active-blue and cursor-pointer
        >
          <List.Item.Meta
            className="m-0"
            avatar={row.icon ? row.icon : null}
            title={
              <div className="m-0">
                <div className="flex justify-between m-0 p-0">
                  <Typography.Text className="w-[95%]">
                    {row.name}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {' '}
                    {row.value}
                  </Typography.Text>
                </div>

                <Progress
                  percent={row.progress}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#394EFF',
                    '100%': '#394EFF',
                  }}
                  size={['small', 2]}
                  style={{
                    padding: '0 0px',
                    margin: '0 0px',
                    height: 4,
                  }}
                />
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}

export default ListWithIcons;
