import React from 'react';
import { Button } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useTheme } from 'App/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
  size?: 'large' | 'middle' | 'small';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  style = {},
  size = 'middle'
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="text"
      icon={theme === 'dark' ? <BulbFilled /> : <BulbOutlined />}
      onClick={toggleTheme}
      className={className}
      style={style}
      size={size}
    />
  );
};

export default ThemeToggle;
