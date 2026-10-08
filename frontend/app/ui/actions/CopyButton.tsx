import { useCopy } from '@/lib/use-copy';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from './IconButton';
import { Button } from './button';

export interface CopyButtonProps {
  text: string;

  label: string;

  onCopied?: () => void;
  className?: string;

  variant?: 'subtle' | 'ghost';
}

export function CopyButton({
  text,
  label,
  onCopied,
  className,
  variant = 'subtle',
}: CopyButtonProps) {
  const { t } = useTranslation();
  const { copy, done } = useCopy();
  const glyph = done ? (
    <Check size={14} className="m-mark" />
  ) : (
    <Copy size={14} />
  );
  const name = done ? t('Copied') : label;
  const doCopy = async () => {
    await copy(text);
    onCopied?.();
  };

  if (variant === 'ghost')
    return (
      <IconButton
        icon={glyph}
        label={name}
        variant="ghost"
        onClick={() => void doCopy()}
      />
    );
  return (
    <Button
      variant="subtle"
      size="icon"
      className={className}
      aria-label={name}
      onClick={() => void doCopy()}
    >
      {glyph}
    </Button>
  );
}
