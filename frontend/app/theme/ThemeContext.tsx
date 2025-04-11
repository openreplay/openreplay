import { ThemeConfig, theme as antdTheme } from 'antd';
import React, { createContext, useContext, useEffect, useState } from 'react';
import colors from './colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  theme: ThemeConfig;
  customTheme: typeof customLightTheme | typeof customDarkTheme;
}

const THEME_KEY = 'openreplay-theme-mode';

const customLightTheme = {
  loginModule: {
    formBg: 'white',
    formBorderColor: colors['gray-light'],
    inputBg: 'white',
    inputBorderColor: colors['gray-light'],
    headingColor: '#555555',
    textColor: '#333333',
  },
  projectCard: {
    bg: 'white',
    borderColor: colors['gray-light'],
    hoverBg: colors['gray-lighter'],
    textColor: '#333333',
    footerBg: colors['gray-lightest'],
  },
  sessionItem: {
    bg: 'white',
    borderColor: colors['gray-light'],
    hoverBg: colors['gray-lighter'],
    textColor: '#333333',
  },
  segmentSelection: {
    wrapperBg: 'white',
    itemBg: 'white',
    itemColor: colors['gray-dark'],
    itemHoverBg: colors['gray-lighter'],
    itemHoverColor: colors.teal,
    itemActiveBg: colors['active-blue'],
    itemActiveColor: colors.teal,
    primaryItemBg: 'white',
    primaryItemColor: colors['gray-dark'],
    primaryItemActiveBg: colors.teal,
    primaryItemActiveColor: 'white',
  },
  circle: {
    bg: 'white',
    borderColor: colors['gray-light'],
    color: colors['gray-dark'],
    hoverBg: colors['gray-lighter'],
    blue: {
      bg: '#1677FF',
      color: 'white',
    },
    green: {
      bg: '#52C41A',
      color: 'white',
    },
    red: {
      bg: '#FF4D4F',
      color: 'white',
    },
    yellow: {
      bg: '#FAAD14',
      color: 'white',
    },
    purple: {
      bg: '#722ED1',
      color: 'white',
    },
    primary: {
      bg: colors.teal,
      color: 'white',
    },
  },
  siteFormModule: {
    inputBg: 'white',
    inputBorderColor: colors['gray-light'],
  },
  escapeButtonModule: {
    closeWrapperBg: 'white',
    closeWrapperColor: colors['gray-dark'],
    closeWrapperBorderColor: colors['gray-light'],
  },
  tooltip: {
    bg: 'white',
    borderColor: colors['gray-light'],
    color: colors['gray-dark'],
  },
  filterOperator: {
    controlBg: 'white',
    controlBorderColor: colors['gray-light'],
    controlColor: colors['gray-dark'],
    menuBg: 'white',
  },
  savedSearchModal: {
    bg: 'white',
    borderColor: colors['gray-light'],
    color: colors['gray-dark'],
    iconContainerBg: colors['gray-lighter'],
  },
  filterModal: {
    bg: 'white',
    headerBg: 'white',
    footerBg: 'white',
    borderColor: colors['gray-light'],
  },
  roleColors: {
    owner: {
      bg: '#E6F7FF',
      color: '#1677FF',
    },
    admin: {
      bg: '#F6FFED',
      color: '#52C41A',
    },
    member: {
      bg: '#FFF7E6',
      color: '#FA8C16',
    },
  },
};

// Custom component theme colors for dark mode
const customDarkTheme = {
  loginModule: {
    formBg: '#1A1A1A',
    formBorderColor: 'rgba(255, 255, 255, 0.06)',
    inputBg: '#141414',
    inputBorderColor: 'rgba(255, 255, 255, 0.06)',
    headingColor: 'rgba(255, 255, 255, 0.85)',
    textColor: 'rgba(255, 255, 255, 0.85)',
  },
  projectCard: {
    bg: '#202020',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    hoverBg: '#252525',
    textColor: 'rgba(255, 255, 255, 0.85)',
    footerBg: '#1A1A1A',
  },
  sessionItem: {
    bg: '#202020',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    hoverBg: '#252525',
    textColor: 'rgba(255, 255, 255, 0.85)',
  },
  segmentSelection: {
    wrapperBg: '#1A1A1A',
    itemBg: '#1A1A1A',
    itemColor: 'rgba(255, 255, 255, 0.65)',
    itemHoverBg: '#252525',
    itemHoverColor: 'rgba(255, 255, 255, 0.85)',
    itemActiveBg: '#252525',
    itemActiveColor: '#4A5CFF',
    primaryItemBg: '#1A1A1A',
    primaryItemColor: 'rgba(255, 255, 255, 0.65)',
    primaryItemActiveBg: '#4A5CFF',
    primaryItemActiveColor: '#FFFFFF',
  },
  circle: {
    bg: '#202020',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.85)',
    hoverBg: '#252525',
    blue: {
      bg: '#1677FF',
      color: 'white',
    },
    green: {
      bg: '#52C41A',
      color: 'white',
    },
    red: {
      bg: '#FF4D4F',
      color: 'white',
    },
    yellow: {
      bg: '#FAAD14',
      color: 'white',
    },
    purple: {
      bg: '#722ED1',
      color: 'white',
    },
    primary: {
      bg: '#4A5CFF',
      color: 'white',
    },
  },
  siteFormModule: {
    inputBg: '#141414',
    inputBorderColor: 'rgba(255, 255, 255, 0.06)',
  },
  escapeButtonModule: {
    closeWrapperBg: '#1A1A1A',
    closeWrapperColor: 'rgba(255, 255, 255, 0.85)',
    closeWrapperBorderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tooltip: {
    bg: '#202020',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  filterOperator: {
    controlBg: '#141414',
    controlBorderColor: 'rgba(255, 255, 255, 0.06)',
    controlColor: 'rgba(255, 255, 255, 0.85)',
    menuBg: '#202020',
  },
  savedSearchModal: {
    bg: '#202020',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.85)',
    iconContainerBg: '#1A1A1A',
  },
  filterModal: {
    bg: '#202020',
    headerBg: '#1A1A1A',
    footerBg: '#1A1A1A',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  roleColors: {
    owner: {
      bg: '#111d66',
      color: '#4A5CFF',
    },
    admin: {
      bg: '#092b00',
      color: '#52C41A',
    },
    member: {
      bg: '#612500',
      color: '#FA8C16',
    },
  },
};

const lightTheme: ThemeConfig = {
  components: {
    Layout: {
      headerBg: colors['gray-lightest'],
      siderBg: colors['gray-lightest'],
      bodyBg: colors['gray-lightest'],
      footerBg: colors['gray-lightest'],
    },
    Segmented: {
      itemSelectedBg: '#FFFFFF',
      itemSelectedColor: colors.main,
    },
    Menu: {
      colorPrimary: colors.teal,
      colorBgContainer: colors['gray-lightest'],
      colorFillTertiary: colors['gray-lightest'],
      colorBgLayout: colors['gray-lightest'],
      subMenuItemBg: colors['gray-lightest'],
      itemHoverBg: colors['active-blue'],
      itemHoverColor: '#1677FF',
      itemActiveBg: colors['active-blue'],
      itemSelectedBg: colors['active-blue'],
      itemSelectedColor: '#1677FF',
      colorItemTextHover: '#1677FF',
      colorItemTextSelected: '#1677FF',
      itemMarginBlock: 0,
      collapsedWidth: 180,
    },
    Button: {
      colorPrimary: colors.teal,
      defaultBg: 'white',
      defaultColor: colors['gray-dark'],
      defaultBorderColor: colors['gray-light'],
      primaryColor: 'white',
      colorPrimaryText: 'white',
      colorTextLightSolid: 'white',
    },
    Card: {
      colorBgContainer: 'white',
      colorBorderSecondary: colors['gray-light'],
      headerBg: 'white',
      bodyBg: 'white',
      actionsBg: colors['gray-lightest'],
    },
    Table: {
      colorBgContainer: 'white',
      headerBg: colors['gray-lightest'],
      headerColor: colors['gray-dark'],
      rowHoverBg: colors['gray-lighter'],
      borderColor: colors['gray-light'],
    },
    Input: {
      colorBgContainer: 'white',
      colorBorder: colors['gray-light'],
      addonBg: colors['gray-lightest'],
    },
    Select: {
      colorBgContainer: 'white',
      colorBorder: colors['gray-light'],
      selectorBg: 'white',
      dropdownBg: 'white',
      optionSelectedBg: colors['gray-lighter'],
      optionActiveBg: colors['gray-lighter'],
    },
    Dropdown: {
      colorBgElevated: 'white',
      menuBg: 'white',
      menuItemHoverBg: colors['gray-lighter'],
    },
    Modal: {
      contentBg: 'white',
      headerBg: 'white',
      footerBg: 'white',
      titleColor: colors['gray-darkest'],
    },
    Drawer: {
      colorBgElevated: 'white',
      headerBg: 'white',
      bodyBg: 'white',
      titleColor: colors['gray-darkest'],
    },
    Tabs: {
      cardBg: 'white',
      cardGutter: 2,
      itemSelectedColor: colors.teal,
      inkBarColor: colors.teal,
    },
    Tag: {
      defaultBg: colors['gray-lightest'],
      defaultColor: colors['gray-dark'],
    },
    Avatar: {
      colorBg: colors['gray-light'],
      colorTextLightSolid: 'white',
    },
  },
  token: {
    colorPrimary: colors.teal,
    colorPrimaryActive: '#394EFF',
    colorBgLayout: colors['gray-lightest'],
    colorBgContainer: 'white',
    colorLink: colors.teal,
    colorLinkHover: colors['teal-dark'],
    colorBorder: colors['gray-light'],
    colorBorderSecondary: colors['gray-light'],
    colorText: colors['gray-darkest'],
    colorTextSecondary: colors['gray-dark'],
    colorTextTertiary: colors['gray-medium'],
    colorTextDisabled: colors['gray-medium'],
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorInfo: colors.teal,
    colorPrimaryText: 'white',
    colorTextLightSolid: 'white',
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "'Roboto', 'ArialMT', 'Arial'",
    fontWeightStrong: 400,
  },
};

const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  components: {
    Layout: {
      headerBg: '#141414',
      siderBg: '#141414',
      colorBgHeader: '#141414',
      colorBgBody: '#141414',
      colorBgTrigger: '#141414',
      colorBgChildren: '#141414',
      colorBgSider: '#141414',
      colorBgSiderTrigger: '#141414',
      footerBg: '#141414',
      contentBg: '#141414',
    },
    Segmented: {
      itemSelectedBg: '#1f1f1f',
      itemSelectedColor: colors.main,
      itemHoverBg: '#252525',
      itemHoverColor: 'rgba(255, 255, 255, 0.85)',
      thumbBg: '#1f1f1f',
      thumbColor: '#4A5CFF',
      borderRadius: 4,
      borderRadiusXS: 4,
      borderRadiusSM: 4,
      borderRadiusLG: 4,
    },
    Menu: {
      colorPrimary: '#4A5CFF',
      colorBgContainer: '#141414',
      colorFillTertiary: '#141414',
      colorBgLayout: '#141414',
      subMenuItemBg: '#141414',
      itemHoverBg: 'rgba(74, 92, 255, 0.1)',
      itemHoverColor: '#1677FF',
      itemActiveBg: 'rgba(74, 92, 255, 0.1)',
      itemSelectedBg: 'rgba(74, 92, 255, 0.1)',
      itemSelectedColor: '#1677FF',
      colorItemText: 'rgba(255, 255, 255, 0.65)',
      colorItemTextHover: '#1677FF',
      colorItemTextSelected: '#1677FF',
      colorItemBg: '#141414',
      colorItemBgHover: 'rgba(74, 92, 255, 0.1)',
      colorItemBgSelected: 'rgba(74, 92, 255, 0.1)',
      colorActiveBarWidth: 0,
      itemMarginBlock: 0,
      collapsedWidth: 180,
      activeBarBorderWidth: 0,
    },
    Button: {
      colorPrimary: colors.teal,
      colorBgContainer: '#1f1f1f',
      colorBorder: 'rgba(255, 255, 255, 0.08)',
      defaultBg: '#1f1f1f',
      defaultColor: 'rgba(255, 255, 255, 0.85)',
      defaultBorderColor: 'rgba(255, 255, 255, 0.08)',
      linkHoverColor: '#4A5CFF',
      primaryTextColor: 'white',
      colorPrimaryText: 'white',
      primaryButtonColor: 'white',
      colorTextLightSolid: 'white',
    },
    Card: {
      colorBgContainer: '#202020',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      colorTextHeading: 'rgba(255, 255, 255, 0.85)',
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
      headerBg: '#202020',
      actionsBg: '#1A1A1A',
    },
    Table: {
      colorBgContainer: '#202020',
      colorTextHeading: 'rgba(255, 255, 255, 0.85)',
      colorText: 'rgba(255, 255, 255, 0.85)',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      colorFillAlter: '#1A1A1A',
      colorFillContent: '#202020',
      colorFillSecondary: '#1A1A1A',
      headerBg: '#1A1A1A',
      headerColor: 'rgba(255, 255, 255, 0.85)',
      headerSortActiveBg: '#252525',
      rowHoverBg: '#252525',
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    Select: {
      colorBgContainer: '#141414',
      colorBgElevated: '#202020',
      colorBorder: 'rgba(255, 255, 255, 0.06)',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.45)',
      optionSelectedBg: '#252525',
      optionActiveBg: '#252525',
      dropdownBg: '#202020',
      selectorBg: '#141414',
      multipleItemBg: '#252525',
      multipleItemBorderColor: 'rgba(255, 255, 255, 0.06)',
    },
    Tabs: {
      colorBgContainer: '#202020',
      itemSelectedColor: '#4A5CFF',
      itemHoverColor: 'rgba(255, 255, 255, 0.85)',
      inkBarColor: '#4A5CFF',
      navBg: '#202020',
      contentBg: '#202020',
      cardBg: '#202020',
      cardGutter: 2,
    },
    Modal: {
      colorBgElevated: '#202020',
      colorIcon: 'rgba(255, 255, 255, 0.45)',
      titleColor: 'rgba(255, 255, 255, 0.85)',
      contentBg: '#202020',
      headerBg: '#202020',
      footerBg: '#202020',
      headerBorderColor: 'rgba(255, 255, 255, 0.06)',
      closeBtnColor: 'rgba(255, 255, 255, 0.45)',
      closeBtnHoverColor: 'rgba(255, 255, 255, 0.85)',
      maskBg: 'rgba(0, 0, 0, 0.45)',
    },
    Drawer: {
      colorBgElevated: '#202020',
      headerBg: '#202020',
      bodyBg: '#202020',
      titleColor: 'rgba(255, 255, 255, 0.85)',
      closeBtnColor: 'rgba(255, 255, 255, 0.45)',
      closeBtnHoverColor: 'rgba(255, 255, 255, 0.85)',
    },
    Popover: {
      colorBgElevated: '#202020',
      colorBorder: 'rgba(255, 255, 255, 0.06)',
      contentBg: '#202020',
      arrowBg: '#202020',
    },
    Tooltip: {
      colorBgDefault: '#202020',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      colorTextLightSolid: 'rgba(255, 255, 255, 0.85)',
    },
    Input: {
      colorBgContainer: '#141414',
      colorBorder: 'rgba(255, 255, 255, 0.06)',
      colorText: 'rgba(255, 255, 255, 0.85)',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.45)',
      addonBg: '#1A1A1A',
      hoverBorderColor: '#4A5CFF',
      activeBorderColor: '#4A5CFF',
      errorBorderColor: '#FF4D4F',
      warningBorderColor: '#FAAD14',
    },
    Avatar: {
      colorBg: '#202020',
      colorTextLightSolid: 'rgba(255, 255, 255, 0.85)',
      groupOverlap: -4,
    },
    Badge: {
      colorBgContainer: '#202020',
      colorBg: '#FF4D4F',
      colorText: '#FFFFFF',
    },
    Tag: {
      colorBgContainer: '#202020',
      defaultBg: '#1f1f1f',
      defaultColor: 'rgba(255, 255, 255, 0.85)',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      colorText: 'rgba(255, 255, 255, 0.85)',
      colorTextLightSolid: 'rgba(255, 255, 255, 0.85)',
      blueColor: '#1677FF',
      greenColor: '#52C41A',
      redColor: '#FF4D4F',
      orangeColor: '#FA8C16',
      purpleColor: '#722ED1',
      closeBtnColor: 'rgba(255, 255, 255, 0.45)',
      closeBtnHoverColor: 'rgba(255, 255, 255, 0.85)',
    },
    Pagination: {
      colorBgContainer: '#202020',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
      colorText: 'rgba(255, 255, 255, 0.85)',
      colorPrimary: '#4A5CFF',
      itemActiveBg: '#202020',
      itemActiveBorderColor: '#4A5CFF',
      itemActiveLinkColor: '#4A5CFF',
    },
    DatePicker: {
      colorBgContainer: '#141414',
      colorBgElevated: '#202020',
      panelBg: '#202020',
      cellSelectedBg: '#4A5CFF',
      cellHoverBg: '#252525',
      cellActiveWithRangeBg: '#111d66',
      controlItemBgActive: '#111d66',
      controlItemBgHover: '#252525',
    },
    Dropdown: {
      colorBgElevated: '#202020',
      colorText: 'rgba(255, 255, 255, 0.85)',
      menuBg: '#202020',
      menuItemBg: '#202020',
      menuItemHoverBg: '#252525',
      menuItemSelectedBg: '#252525',
      menuItemSelectedColor: '#4A5CFF',
    },
    Form: {
      labelColor: 'rgba(255, 255, 255, 0.85)',
      colorText: 'rgba(255, 255, 255, 0.85)',
    },
  },
  token: {
    colorPrimary: colors.teal,
    colorPrimaryActive: '#4A5CFF',
    colorBgLayout: '#141414',
    colorBgContainer: '#141414',
    colorBgElevated: '#1A1A1A',
    colorLink: colors.teal,
    colorLinkHover: colors['teal-dark'],
    colorBorder: 'rgba(255, 255, 255, 0.06)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
    colorSplit: 'rgba(255, 255, 255, 0.06)',
    colorText: 'rgba(255, 255, 255, 0.85)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
    colorTextDisabled: 'rgba(255, 255, 255, 0.25)',
    colorBgMask: 'rgba(0, 0, 0, 0.45)',
    colorIcon: 'rgba(255, 255, 255, 0.85)',
    colorIconHover: '#4A5CFF',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorInfo: '#4A5CFF',
    colorPrimaryText: 'white',
    colorTextLightSolid: 'white',
    colorFillContent: '#1A1A1A',
    colorFillContentHover: '#252525',
    colorFillAlter: '#1A1A1A',
    colorBgSpotlight: '#252525',
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "'Roboto', 'ArialMT', 'Arial'",
    fontWeightStrong: 400,
    lineWidth: 1.5,
    lineWidthBold: 1.5,
  },
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  theme: lightTheme,
  customTheme: customLightTheme,
});

export const useTheme = () => useContext(ThemeContext);

export const useCustomTheme = () => {
  const { customTheme } = useTheme();
  return customTheme;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem(THEME_KEY);
    return (savedMode as ThemeMode) || 'light';
  });

  const theme = mode === 'light' ? lightTheme : darkTheme;
  const customTheme = mode === 'light' ? customLightTheme : customDarkTheme;

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem(THEME_KEY, newMode);
  };

  useEffect(() => {
    // Add/remove 'dark' class to the document body when theme changes
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, theme, customTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
