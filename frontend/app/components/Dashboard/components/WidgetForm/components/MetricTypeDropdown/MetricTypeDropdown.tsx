import React, { useMemo } from 'react';
import { TYPES, LIBRARY } from 'App/constants/card';
import Select from 'Shared/Select';
import { MetricType } from 'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem';
import { components } from 'react-select';
import CustomDropdownOption from 'Shared/CustomDropdownOption';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import withLocationHandlers from 'HOCs/withLocationHandlers';

interface Options {
  label: string;
  icon: string;
  value: string;
  description: string;
}

interface Props {
  query: Record<string, (key: string) => any>;
}
function MetricTypeDropdown(props: Props) {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;
  const options: Options[] = useMemo(() => {
    // TYPES.shift(); // remove "Add from library" item
    return TYPES.filter((i: MetricType) => i.slug !== LIBRARY).map((i: MetricType) => ({
      label: i.title,
      icon: i.icon,
      value: i.slug,
      description: i.description,
    }));
  }, []);

  React.useEffect(() => {
    const queryCardType = props.query.get('type')
    if (queryCardType && options.length > 0 && metric.metricType) {
      const type = options.find((i) => i.value === queryCardType)
      setTimeout(() => onChange(type.value), 0)
    }
  }, [])

  const onChange = (type: string) => {
    metricStore.changeType(type)
  }
  return (
    <Select
      name="metricType"
      placeholder="Select Card Type"
      options={options}
      value={options.find((i: any) => i.value === metric.metricType) || options[0]}
      onChange={(selected) => onChange(selected.value.value as string)}
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

export default withLocationHandlers()(observer(MetricTypeDropdown));
