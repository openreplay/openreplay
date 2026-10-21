import { cn } from '@/lib/utils';
import { useWave } from '@/ui/feedback/wave';
import * as S from '@radix-ui/react-switch';
import type { ComponentProps } from 'react';

export function Switch({
  className,
  checked,
  onClick,
  disabled,
  ...props
}: ComponentProps<typeof S.Root>) {
  const { trigger, rings } = useWave();
  return (
    <S.Root
      checked={checked}
      disabled={disabled}
      className={cn(
        'm-switch peer relative inline-flex h-[1rem] w-[1.75rem] shrink-0 items-center rounded-full border border-transparent',
        'm-press bg-[var(--m-border-strong)]',
        'data-[state=checked]:bg-[var(--m-action-accent-bg)]',

        '[--m-wave-color:var(--m-action-accent-bg)] data-[state=checked]:[--m-wave-color:var(--m-border-strong)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={(e) => {
        if (!disabled) trigger();
        onClick?.(e);
      }}
      {...props}
    >
      <S.Thumb className="m-thumb m-switch__handle pointer-events-none block rounded-full bg-[var(--m-action-accent-fg)]" />
      {rings}
    </S.Root>
  );
}
