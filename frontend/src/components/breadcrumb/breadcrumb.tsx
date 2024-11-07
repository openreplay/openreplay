"use client";

import * as React from "react";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  Breadcrumb as ShadcnBreadcrumb,
} from "@/shadcn-components/breadcrumb";
import { Slash } from "lucide-react";
import useUniqueId from "@/hooks/use-unique-id";

type BreadcrumbItemType = {
  label: string;
  href?: string;
  isCurrent?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItemType[];
  separator?: React.ReactNode;
};

const Breadcrumb = ({
  items,
  separator = <Slash className="-rotate-12" />,
}: BreadcrumbProps) => {
  const uniqueIds = useUniqueId(items.length);

  return (
    <ShadcnBreadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <div key={uniqueIds[index]} className="flex items-center gap-1">
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink
                  href={item.href}
                  className="text-sm font-normal text-primary transition-colors duration-300 ease-in-out hover:text-[#f3562e]"
                >
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <span className="-ml-1.5 text-zinc-400 dark:text-neutral-400">
                  {item.label}
                </span>
              )}
            </BreadcrumbItem>

            {/* Render separator for all items except the last one */}
            {index < items.length - 1 && (
              <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
            )}
          </div>
        ))}
      </BreadcrumbList>
    </ShadcnBreadcrumb>
  );
};

export { Breadcrumb };
