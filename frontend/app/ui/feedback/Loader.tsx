import { cn } from '@/lib/utils';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import React from 'react';

interface Props {
  className?: string;
  loading?: boolean;
  children?: React.ReactNode;
  size?: number;
  style?: Record<string, any>;
}

/** The OpenReplay mark with a light crossing it while `loading`. */
export const Loader = React.memo<Props>(
  ({
    className = '',
    loading = true,
    children = null,
    size = 50,
    style = { minHeight: '150px' },
  }) =>
    !loading ? (
      <>{children}</>
    ) : (
      <div
        className={cn('flex h-full items-center justify-center', className)}
        style={style}
        role="status"
        aria-label="Loading"
      >
        <OpenReplayMark loop size={Math.max(16, Math.round(size * 0.55))} />
      </div>
    ),
);

Loader.displayName = 'Loader';
