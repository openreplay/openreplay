import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { TYPES } from 'App/constants/card';
import { MetricType } from 'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem';
import React from 'react';
import Select from 'Shared/Select';
import { components } from 'react-select';
import CustomDropdownOption from 'Shared/CustomDropdownOption';

interface Props {
  onSelect: any;
}
function MetricSubtypeDropdown(props: Props) {
  const { metricStore } = useStore();
  const metric: any =  metricStore.instance;

  const options: any = React.useMemo(() => {
    const type = TYPES.find((i: MetricType) => i.slug === metric.metricType);
    if (type && type.subTypes) {
      const options = type.subTypes.map((i: MetricType) => ({
        label: i.title,
        icon: i.icon,
        value: i.slug,
        description: i.description,
      }));
      return options;
    }
    return false;
  }, [metric.metricType]);

  React.useEffect(() => {
    // @ts-ignore
    if (options && !options.map(i => i.value).includes(metric.metricOf)) {
      setTimeout(() => props.onSelect({ name: 'metricOf', value: { value: options[0].value }}), 0)
    }
  }, [metric.metricType])

  return options ? (
    <>
      <div className="mx-3">of</div>
      <Select
        name="metricOf"
        placeholder="Select Card Type"
        options={options}
        value={options.find((i: any) => i.value === metric.metricOf)}
        onChange={props.onSelect}
        // className="mx-2"
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
    </>
  ) : null;
}

export default observer(MetricSubtypeDropdown);
