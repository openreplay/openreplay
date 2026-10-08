import { Tooltip } from '@/ui/overlays/tooltip';
import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

export function QuestionMarkHint({
  content,
  className,
}: {
  content: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip title={content}>
      <span
        className={`inline-flex text-content-muted hover:text-content-secondary${className ? ` ${className}` : ''}`}
      >
        <CircleHelp size={14} aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
