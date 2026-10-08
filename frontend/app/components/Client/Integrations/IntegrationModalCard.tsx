import { Icon } from '@/ui/icons/Icon';
import React from 'react';

interface Props {
  title: string;
  icon: string;
  description: string;
  useIcon?: boolean;
}

/** The head of an integration's side panel: logo, name, what it does. */
function IntegrationModalCard({ title, icon, description, useIcon }: Props) {
  return (
    <div className="flex items-start gap-4 border-b border-border-subtle p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-surface border border-border-subtle bg-surface-default">
        {useIcon ? (
          <Icon name={icon as any} size={28} />
        ) : (
          <img className="size-7" src={`/assets/${icon}.svg`} alt="" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-lg font-medium text-content-primary">{title}</h3>
        <p className="text-sm text-content-muted">{description}</p>
      </div>
    </div>
  );
}

export default IntegrationModalCard;
