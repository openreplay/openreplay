import { Button, Dropdown, MenuProps, Space, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownOutlined } from '@ant-design/icons';
import { Languages } from 'lucide-react';
import { Icon } from '../ui';

const langs = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中國人' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChangeLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  }, []);

  const menuItems: MenuProps['items'] = langs.map((lang) => ({
    key: lang.code,
    label: (
      <div key={lang.code} className="!py-1 flex items-center gap-2">
        <Typography className="capitalize">{lang.label}</Typography>
      </div>
    ),
  }));

  return (
    <Dropdown
      menu={{
        items: menuItems,
        selectable: true,
        defaultSelectedKeys: [i18n.language],
        style: {
          maxHeight: 500,
          overflowY: 'auto',
        },
        onClick: (e) => handleChangeLanguage(e.key),
      }}
      placement="bottomLeft"
    >
      <Button icon={<Languages size={12} />} />
    </Dropdown>
  );
}

export default LanguageSwitcher;
