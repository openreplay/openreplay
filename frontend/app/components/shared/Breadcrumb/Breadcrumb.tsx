import React from 'react';
import { Icon } from 'UI';
import { Link } from 'react-router-dom';
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'
import { withSiteId } from "App/routes";

interface Props {
  items: any;
}

function Breadcrumb(props: Props) {
  const { items } = props;
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;

  return (
    <div className="mb-3 flex items-center flex-wrap text-lg">
      {items.map((item: any, index: any) => {
        if (index === items.length - 1) {
          return (
            <span key={index} className="color-gray-medium capitalize-first whitespace-nowrap">
              {item.label}
            </span>
          );
        }
        if (item.to === undefined) {
          return (
            <div
              key={index}
              className="color-gray-darkest hover:text-teal group flex items-center"
            >
              <span className="color-gray-medium capitalize-first whitespace-nowrap">
                {item.label}
              </span>
              <span className="mx-2">/</span>
            </div>
          );
        }
        return (
          <div key={index} className="color-gray-darkest hover:text-teal group flex items-center">
            <Link to={item.withSiteId ? withSiteId(item.to, siteId) : item.to} className="flex items-center default-hover">
              {index === 0 && (
                <Icon
                  name="chevron-left"
                  size={16}
                  className="mr-1 group-hover:fill-teal"
                />
              )}
              <span className="capitalize-first whitespace-nowrap">{item.label}</span>
            </Link>
            <span className="mx-2">/</span>
          </div>
        );
      })}
    </div>
  );
}

export default observer(Breadcrumb);
