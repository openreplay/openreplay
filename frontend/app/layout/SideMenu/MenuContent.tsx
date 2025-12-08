import { Menu, Tag, Typography } from 'antd';
import cn from 'classnames';
import React from 'react';
import { Icon } from 'UI';

const { Text } = Typography;

interface Props {
  menu: any[];
  isMenuItemActive: (key: string) => boolean;
  handleClick: (item: any) => void;
  isCollapsed?: boolean;
}

function RenderDivider({ index }: { index: number }) {
  if (index === 0) return null;
  return <div className="my-1 border-t" />;
}

export default function MenuContent({
  menu,
  isMenuItemActive,
  handleClick,
  isCollapsed,
}: Props) {
  return (
    <Menu
      mode="inline"
      onClick={handleClick}
      style={{ marginTop: 8, border: 'none' }}
      selectedKeys={menu.flatMap((cat) =>
        cat.items
          .filter((i: any) => isMenuItemActive(i.key))
          .map((i: any) => i.key),
      )}
    >
      {menu.map((category, idx) => (
        <React.Fragment key={category.key}>
          {!category.hidden && (
            <>
              <RenderDivider index={idx} />

              {category.items
                .filter((it: any) => !it.hidden)
                .map((it: any) => {
                  const active = isMenuItemActive(it.key);

                  if (it.key === 'exit') {
                    return (
                      <Menu.Item
                        key={it.key}
                        style={{ paddingLeft: 20 }}
                        icon={
                          <Icon
                            name={it.icon}
                            size={16}
                            color={active ? 'teal' : 'black'}
                          />
                        }
                        className={cn(
                          '!rounded-lg hover-fill-teal',
                          active ? 'color-main' : 'color-black',
                        )}
                      >
                        {it.label}
                      </Menu.Item>
                    );
                  }

                  return it.children ? (
                    <Menu.SubMenu
                      key={it.key}
                      title={isCollapsed ? false : <Text>{it.label}</Text>}
                      icon={<Icon name={it.icon} size={16} />}
                      className="test"
                      rootClassName="test2"
                    >
                      {it.children.map((child: any) => (
                        <Menu.Item
                          key={child.key}
                          className={cn('ml-8', {
                            'ant-menu-item-selected !bg-active-dark-blue':
                              isMenuItemActive(child.key),
                          })}
                        >
                          <div className="flex items-center gap-4 hover-fill-teal">
                            <Icon
                              name={child.icon}
                              size={16}
                              color={
                                isMenuItemActive(child.key) ? 'teal' : 'black'
                              }
                              className="hover-fill-teal"
                            />
                            <span>{child.label}</span>
                            {child.tag && (
                              <Tag
                                color={child.tag.color}
                                bordered={child.tag.border}
                                className="text-xs ml-auto"
                              >
                                {child.tag.label}
                              </Tag>
                            )}
                          </div>
                        </Menu.Item>
                      ))}
                    </Menu.SubMenu>
                  ) : (
                    <Menu.Item
                      key={it.key}
                      icon={
                        <Icon
                          name={it.icon}
                          size={16}
                          color={active ? 'teal' : 'black'}
                          className="hover-fill-teal"
                        />
                      }
                      style={{ paddingLeft: 20 }}
                      className={cn(
                        '!rounded-lg hover-fill-teal',
                        active ? 'color-main' : 'color-black',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{it.label}</span>
                        {it.tag && (
                          <Tag
                            color={it.tag.color}
                            bordered={it.tag.border}
                            className="text-xs ml-2"
                          >
                            {it.tag.label}
                          </Tag>
                        )}
                      </div>
                    </Menu.Item>
                  );
                })}
            </>
          )}
        </React.Fragment>
      ))}
    </Menu>
  );
}
