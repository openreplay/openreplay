// @ts-nocheck
import { DatePicker } from 'antd';
import { PickerTimeProps } from 'antd/es/time-picker';
import React from 'react';
import luxonGenerateConfig from './config';

const CustomPicker = DatePicker.generatePicker<DateTime>(luxonGenerateConfig);

export interface TimePickerProps
  extends Omit<PickerTimeProps<DateTime>, 'picker'> {}

const TimePicker = React.forwardRef<any, TimePickerProps>((props, ref) => (
  <CustomPicker {...props} picker="time" mode={undefined} ref={ref} />
));

TimePicker.displayName = 'TimePicker';

export { CustomPicker as DatePicker, TimePicker };
