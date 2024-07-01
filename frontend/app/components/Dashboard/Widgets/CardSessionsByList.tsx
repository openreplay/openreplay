import React from 'react';
import { List, Progress, Typography } from "antd";
import cn from "classnames";

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
            renderItem={(row: any) => (
                <List.Item
                    key={row.name}
                    onClick={(e) => onClickHandler(e, row)} // Remove onClick handler to disable click interaction
                    style={{
                        borderBottom: '1px dotted rgba(0, 0, 0, 0.05)',
                        padding: '4px 10px',
                        lineHeight: '1px'
                    }}
                    className={cn('rounded', selected === row.name ? 'bg-active-blue' : '')} // Remove hover:bg-active-blue and cursor-pointer
                >
                    <List.Item.Meta
                        className="m-0"
                        avatar={row.icon ? row.icon : null}
                        title={(
                            <div className="m-0">
                                <div className="flex justify-between m-0 p-0">
                                    <Typography.Text>{row.name}</Typography.Text>
                                    <Typography.Text type="secondary"> {row.sessionCount}</Typography.Text>
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
