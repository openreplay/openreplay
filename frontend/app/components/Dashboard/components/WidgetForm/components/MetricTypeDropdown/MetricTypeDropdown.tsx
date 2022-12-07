import React, { useMemo } from 'react';
import { TYPES, LIBRARY } from 'App/constants/card';
import Select from 'Shared/Select';
import { MetricType } from 'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem';
import { components } from 'react-select';
import CustomDropdownOption from 'Shared/CustomDropdownOption';
import { useObserver } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

interface Props {
  onSelect: any;
}
function MetricTypeDropdown(props: Props) {
  const { metricStore } = useStore();
  const metric: any = useObserver(() => metricStore.instance);
  const options: any = useMemo(() => {
    // TYPES.shift(); // remove "Add from library" item
    return TYPES.filter((i: MetricType) => i.slug !== LIBRARY).map((i: MetricType) => ({
      label: i.title,
      icon: i.icon,
      value: i.slug,
      description: i.description,
    }));
  }, []);

  const onSelect = (_: any, option: Record<string, any>) =>
    props.onSelect({ value: { value: option.value }, name: option.name });

  return (
    <Select
      name="metricType"
      placeholder="Select Card Type"
      options={options}
      value={options.find((i: any) => i.value === metric.metricType) || options[0]}
      onChange={props.onSelect}
      // onSelect={onSelect}
      components={{
        MenuList: ({ children, ...props }: any) => {
          return (
            <components.MenuList {...props} className="!p-3">
              {children}
            </components.MenuList>
          );
        },
        Option: ({ children, ...props }: any) => {
          const { data } = props;
          return <CustomDropdownOption children={children} {...props} {...data} />;
        },
      }}
    />
  );
}

export default MetricTypeDropdown;
