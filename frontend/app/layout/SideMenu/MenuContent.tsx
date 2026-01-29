import { Menu, MenuProps, Tag, Typography } from 'antd';
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

export default function MenuContent({
  menu,
  isMenuItemActive,
  handleClick,
  isCollapsed,
}: Props) {
  const selectedKeys = React.useMemo(() => {
    const keys: string[] = [];

    menu.forEach((category) => {
      if (category?.hidden) return;

      (category.items ?? []).forEach((it: any) => {
        if (isMenuItemActive(it.key)) {
          keys.push(it.key);
        }

        (it.children ?? []).forEach((child: any) => {
          if (isMenuItemActive(child.key)) {
            keys.push(child.key);
          }
        });
      });
    });

    return keys;
  }, [menu, isMenuItemActive]);

  const items: MenuProps['items'] = React.useMemo(() => {
    return menu.flatMap((category, idx) => {
      if (category?.hidden) return [];

      const categoryItems: NonNullable<MenuProps['items']> = (
        category.items ?? []
      )
        .filter((it: any) => !it.hidden)
        .map((it: any) => {
          const active = isMenuItemActive(it.key);

          if (it.key === 'exit') {
            return {
              key: it.key,
              icon: (
                <Icon
                  name={it.icon}
                  size={16}
                  color={active ? 'teal' : 'black'}
                />
              ),
              style: { paddingLeft: 20 },
              className: cn(
                'rounded-lg! hover-fill-teal',
                active ? 'color-main' : 'color-black',
              ),
              label: it.label,
            };
          }

          if (it.children) {
            return {
              key: it.key,
              icon: (
                <Icon
                  name={it.icon}
                  size={16}
                  color={active ? 'teal' : 'black'}
                  className="hover-fill-teal"
                />
              ),
              label: isCollapsed ? null : (
                <div className="flex items-center gap-2 hover-fill-teal">
                  <Text>{it.label}</Text>
                  {it.tag && (
                    <Tag
                      color={it.tag.color}
                      variant={it.tag.border ? 'outlined' : 'filled'}
                      className="text-xs ml-auto"
                    >
                      {it.tag.label}
                    </Tag>
                  )}
                </div>
              ),
              children: (it.children ?? [])
                .filter((ch: any) => !ch.hidden)
                .map((child: any) => {
                  const childActive = isMenuItemActive(child.key);

                  return {
                    key: child.key,
                    className: 'ml-8',
                    label: (
                      <div className="flex items-center gap-4 hover-fill-teal">
                        {child.icon && (
                          <Icon
                            name={child.icon}
                            size={16}
                            color={childActive ? 'teal' : 'black'}
                            className="hover-fill-teal"
                          />
                        )}
                        <span>{child.label}</span>
                        {child.tag && (
                          <Tag
                            color={child.tag.color}
                            variant={child.tag.border ? 'outlined' : 'filled'}
                            className="text-xs ml-auto"
                          >
                            {child.tag.label}
                          </Tag>
                        )}
                      </div>
                    ),
                  };
                }),
            };
          }

          return {
            key: it.key,
            icon: (
              <Icon
                name={it.icon}
                size={16}
                color={active ? 'teal' : 'black'}
                className="hover-fill-teal"
              />
            ),
            style: { paddingLeft: 20 },
            className: cn(
              'rounded-lg! hover-fill-teal',
              active ? 'color-main' : 'color-black',
            ),
            label: (
              <div className="flex items-center justify-between">
                <span>{it.label}</span>
                {it.tag && (
                  <Tag
                    color={it.tag.color}
                    variant={it.tag.border ? 'outlined' : 'filled'}
                    className="text-xs ml-2"
                  >
                    {it.tag.label}
                  </Tag>
                )}
              </div>
            ),
          };
        });

      const divider: NonNullable<MenuProps['items']> =
        idx === 0 ? [] : [{ type: 'divider' as const }];

      return [...divider, ...categoryItems];
    });
  }, [menu, isCollapsed, isMenuItemActive]);

  return (
    <Menu
      mode="inline"
      onClick={handleClick}
      style={{ marginTop: 8, border: 'none' }}
      selectedKeys={selectedKeys}
      items={items}
    />
  );
}
