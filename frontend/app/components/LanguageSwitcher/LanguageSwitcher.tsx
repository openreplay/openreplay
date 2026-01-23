import { Button, Dropdown, MenuProps, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

const langs = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '简体中文' },
];
const langLabels = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  ru: 'Русский',
  zh: '中國人',
};

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [selected, setSelected] = React.useState(i18n.language);

  const onChange = (val: string) => {
    setSelected(val);
  };
  const handleChangeLanguage = () => {
    void i18n.changeLanguage(selected);
    localStorage.setItem('i18nextLng', selected);
  };

  const menuItems: MenuProps['items'] = langs.map((lang) => ({
    key: lang.code,
    label: (
      <div key={lang.code} className="py-1! flex items-center gap-2">
        <Typography className="capitalize">{lang.label}</Typography>
      </div>
    ),
  }));

  return (
    <div className={'flex flex-col gap-2 align-start p-4 md:p-0'}>
      <div className="flex flex-row gap-2">
        <Dropdown
          menu={{
            items: menuItems,
            selectable: true,
            defaultSelectedKeys: [i18n.language],
            style: {
              maxHeight: 500,
              overflowY: 'auto',
            },
            onClick: (e) => onChange(e.key),
          }}
        >
          <Button>
            <div className={'flex justify-between items-center gap-8'}>
              <span>{langLabels[selected]}</span>
              <ChevronDown size={14} />
            </div>
          </Button>
        </Dropdown>
        <Button className={'w-fit'} onClick={handleChangeLanguage}>
          {i18n.t('Update')}
        </Button>
      </div>
    </div>
  );
}

export default LanguageSwitcher;
