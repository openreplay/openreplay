import { useCopy } from '@/lib/use-copy';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from './IconButton';

export interface CopyMarkdownProps {
  markdown: () => string;
  label: string;
  icon: ReactNode;
}

export function CopyMarkdown({ markdown, label, icon }: CopyMarkdownProps) {
  const { t } = useTranslation();
  const { copy: put, done } = useCopy();
  const copy = () => put(markdown());

  return (
    <IconButton
      icon={done ? <Check size={15} /> : icon}
      label={done ? t('Copied as markdown') : label}
      variant="ghost"
      active={done}
      onClick={copy}
    />
  );
}
