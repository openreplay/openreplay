import { cn } from '@/lib/utils';
import * as T from '@radix-ui/react-tooltip';
import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  isValidElement,
} from 'react';

export const TooltipProvider = T.Provider;

export function Tooltip({
  title,
  children,
  side = 'top',
  delay = 200,
  ...props
}: {
  title: ReactNode;
  children: ReactNode;
  side?: ComponentProps<typeof T.Content>['side'];
  delay?: number;
  open?: boolean;
}) {
  if (!title) return <>{children}</>;
  // the trigger slots onto one element; text or fragments get a span to hold the ref
  const slottable =
    isValidElement(children) && children.type !== Fragment ? (
      children
    ) : (
      <span className="inline-flex">{children}</span>
    );
  return (
    <T.Root delayDuration={delay} {...props}>
      <T.Trigger asChild>{slottable}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className={cn(
            'm-tip z-[var(--m-z-tooltip)] max-w-72 rounded-control border border-[var(--m-tooltip-border)] bg-[var(--m-tooltip-bg)] px-4 py-2',
            'text-xs leading-snug text-[var(--m-tooltip-fg)]',
          )}
        >
          {title}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
