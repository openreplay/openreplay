import React from 'react';
import { DROPDOWN_OPTIONS, Option } from 'App/constants/card';
import Select from 'Shared/Select';
import { components } from 'react-select';
import CustomDropdownOption from 'Shared/CustomDropdownOption';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { Icon } from 'UI';
interface Options {
  label: string;
  icon: string;
  value: string;
  description: string;
}

interface Props {
  query: Record<string, (key: string) => any>;
  onSelect: (arg: any) => void;
}
function MetricTypeDropdown(props: Props) {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  React.useEffect(() => {
    const queryCardType = props.query.get('type');
    if (queryCardType && DROPDOWN_OPTIONS.length > 0 && metric.metricType) {
      const type: Option = DROPDOWN_OPTIONS.find((i) => i.value === queryCardType) as Option;
      setTimeout(() => onChange(type.value), 0);
    }
  }, []);

  const onChange = (type: string) => {
    metricStore.changeType(type);
  };

  return (
    <Select
      name="metricType"
      placeholder="Select Card Type"
      options={DROPDOWN_OPTIONS}
      value={
        DROPDOWN_OPTIONS.find((i: any) => i.value === metric.metricType) || DROPDOWN_OPTIONS[0]
      }
      onChange={props.onSelect}
      components={{
        SingleValue: ({ children, ...props }: any) => {
          const {
            data: { icon, label },
          } = props;
          return (
            <components.SingleValue {...props}>
              <div className="flex items-center">
                <Icon name={icon} size="18" color="gray-medium" />
                <div className="ml-2">{label}</div>
              </div>
            </components.SingleValue>
          );
        },
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
