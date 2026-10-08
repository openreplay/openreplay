import { Tooltip } from '@/ui/overlays/tooltip';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from 'App/ThemeContext';

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? Moon : Sun;
  const label =
    theme === 'dark' ? t('Switch to light theme') : t('Switch to dark theme');
  return (
    <Tooltip title={label} side="right">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className={className}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
