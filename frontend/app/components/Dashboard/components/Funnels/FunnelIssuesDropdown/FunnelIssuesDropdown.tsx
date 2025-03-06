import React, { useEffect } from 'react';
import Select from 'Shared/Select';
import { components } from 'react-select';
import { Button } from 'antd';
import { FunnelPlotOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import FunnelIssuesSelectedFilters from '../FunnelIssuesSelectedFilters';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const options = (t: TFunction) => [
  { value: 'click_rage', label: t('Click Rage') },
  { value: 'dead_click', label: t('Dead Click') },
  { value: 'excessive_scrolling', label: t('Excessive Scrolling') },
  { value: 'bad_request', label: t('Bad Request') },
  { value: 'missing_resource', label: t('Missing Image') },
  { value: 'memory', label: t('High Memory Usage') },
  { value: 'cpu', label: t('High CPU') },
  { value: 'slow_resource', label: t('Slow Resource') },
  { value: 'slow_page_load', label: t('Slow Page') },
  { value: 'crash', label: t('Crash') },
  { value: 'custom_event_error', label: t('Custom Error') },
  { value: 'js_error', label: t('Error') },
];

function FunnelIssuesDropdown() {
  const { t } = useTranslation();
  const { funnelStore } = useStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<any>([]);
  const filteredOptions = options(t).filter(
    (option: any) => !selectedValues.includes(option.value),
  );

  const selectedOptions = options(t).filter((option: any) =>
    selectedValues.includes(option.value),
  );

  useEffect(() => {
    funnelStore.updateKey('issuesFilter', selectedOptions);
  }, [selectedOptions]);

  const handleChange = ({ value }: any) => {
    toggleSelectedValue(value.value);
  };

  const toggleSelectedValue = (value: string) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter((v) => v !== value));
    } else {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const onClickOutside = (e: any) => {
    if (e.target.id === 'dd-button') return;
    if (isOpen) {
      setTimeout(() => {
        setIsOpen(false);
      }, 0);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        menuIsOpen={isOpen}
        // onMenuOpen={() => setIsOpen(true)}
        // onMenuClose={() => setIsOpen(false)}
        options={filteredOptions}
        onChange={handleChange}
        styles={{
          control: (provided: any) => ({
            ...provided,
            border: 'transparent',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            minHeight: 'unset',
          }),
          menuList: (provided: any) => ({
            ...provided,
            padding: 0,
            minWidth: '190px',
          }),
        }}
        components={{
          ValueContainer: (): any => null,
          DropdownIndicator: (): any => null,
          IndicatorSeparator: (): any => null,
          IndicatorsContainer: (): any => null,
          Control: ({ children, ...props }: any) => (
            <OutsideClickDetectingDiv
              className="relative items-center block"
              onClickOutside={onClickOutside}
            >
              <components.Control {...props}>
                {children}
                <Button
                  id="dd-button"
                  className="px-2 select-none gap-0"
                  onClick={() => setIsOpen(!isOpen)}
                  icon={<FunnelPlotOutlined />}
                  type="primary"
                  ghost
                  size="small"
                >
                  <span className="ml-2 pointer-events-none">
                    {t('Issues')}
                  </span>
                </Button>
              </components.Control>
            </OutsideClickDetectingDiv>
          ),
          Placeholder: (): any => null,
          SingleValue: (): any => null,
        }}
      />
      <FunnelIssuesSelectedFilters removeSelectedValue={toggleSelectedValue} />
    </div>
  );
}

export default FunnelIssuesDropdown;
