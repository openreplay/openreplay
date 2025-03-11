import { issues_types, types } from 'Types/session/issue';
import { Segmented } from 'antd';
import { Angry, CircleAlert, Skull, WifiOff, ChevronDown } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

const tagIcons = {
  [types.ALL]: undefined,
  [types.JS_EXCEPTION]: <CircleAlert size={14} />,
  [types.BAD_REQUEST]: <WifiOff size={14} />,
  [types.CLICK_RAGE]: <Angry size={14} />,
  [types.CRASH]: <Skull size={14} />,
  [types.TAP_RAGE]: <Angry size={14} />,
} as Record<string, any>;

function SessionTags() {
  const { t } = useTranslation();
  const { projectsStore, sessionStore, searchStore } = useStore();
  const total = sessionStore.total;
  const platform = projectsStore.active?.platform || '';
  const activeTab = searchStore.activeTags;
  const [isMobile, setIsMobile] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = issues_types
    .filter(
      (tag) =>
        tag.type !== 'mouse_thrashing' &&
        (platform === 'web'
          ? tag.type !== types.TAP_RAGE
          : tag.type !== types.CLICK_RAGE),
    )
    .map((tag) => ({
      value: tag.type,
      icon: tagIcons[tag.type],
      label: t(tag.name),
    }));

  // Find the currently active option
  const activeOption =
    filteredOptions.find((option) => option.value === activeTab[0]) ||
    filteredOptions[0];

  // Check if on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !(dropdownRef.current as HTMLElement).contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handler for dropdown item selection
  const handleSelectOption = (value: string) => {
    searchStore.toggleTag(value as any);
    setIsDropdownOpen(false);
  };

  if (total === 0 && (activeTab.length === 0 || activeTab[0] === 'all')) {
    return null;
  }

  return (
    <div className="flex items-center">
      {isMobile ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center text-start justify-between w-full px-3 py-2 text-base bg-white border rounded-lg focus:outline-none"
          >
            <div className="flex items-center">
              {activeOption.icon && (
                <span className="mr-2">{activeOption.icon}</span>
              )}
              <span className="text-start">{activeOption.label}</span>
            </div>
            <ChevronDown
              size={16}
              className={`ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 w-full min-w-40 mt-1 bg-white border rounded-xl max-h-60 overflow-auto">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                    option.value === activeTab[0]
                      ? 'bg-gray-50 font-medium'
                      : ''
                  }`}
                  onClick={() => handleSelectOption(option.value)}
                >
                  {option.icon && <span className="mr-2">{option.icon}</span>}
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Segmented
          options={filteredOptions}
          value={activeTab[0]}
          onChange={(value) => searchStore.toggleTag(value as any)}
          size={'small'}
        />
      )}
    </div>
  );
}

export default observer(SessionTags);
