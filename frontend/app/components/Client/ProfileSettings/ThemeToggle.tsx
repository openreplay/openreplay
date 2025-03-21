import { useTheme } from 'App/theme/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from 'UI';

const ThemeToggle = () => {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = mode === 'dark';

  return (
    <div className="flex items-center">
      <div className="mr-4 flex items-center">
        <Switch onChange={toggleTheme} checked={isDark} />
        {isDark ? (
          <Moon className="ml-2" size={16} strokeWidth={1.5} />
        ) : (
          <Sun className="ml-2" size={16} strokeWidth={1.5} />
        )}
      </div>
      <div>
        <div className="text-base font-medium">
          {isDark ? t('Dark Mode') : t('Light Mode')}
        </div>
        <div className="text-sm text-gray-medium">
          {isDark ? t('Switch to light mode') : t('Switch to dark mode')}
        </div>
      </div>
    </div>
  );
};

export default observer(ThemeToggle);
