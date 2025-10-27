import React from 'react';
import { Button } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'App/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
  size?: 'large' | 'middle' | 'small';
}

const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      icon={theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      onClick={toggleTheme}
    />
  );
};

export default ThemeToggle;
