import { Tooltip } from '@/ui/overlays/tooltip';

export interface MoreCountProps {
  hidden: readonly string[];
}

export function MoreCount({ hidden }: MoreCountProps) {
  if (hidden.length === 0) return null;
  return (
    <Tooltip title={hidden.join(', ')} delay={200}>
      <span
        style={{
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
          cursor: 'default',
          flex: 'none',
        }}
      >
        +{hidden.length}
      </span>
    </Tooltip>
  );
}
