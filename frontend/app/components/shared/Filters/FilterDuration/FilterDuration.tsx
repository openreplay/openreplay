import React from 'react';
import { Input } from 'antd';
import styles from './FilterDuration.module.css';

type Values = { minDuration?: number | null; maxDuration?: number | null };

type Props = {
  minDuration?: number | null;
  maxDuration?: number | null;
  isConditional?: boolean;
  onChange?: (values: Values) => void;
  onEnterPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

type State = { focused: boolean };

const fromMs = (value?: number | null): string =>
  value ? `${value / 1000 / 60}` : '';
const toMs = (value: string): number | null =>
  value !== '' ? Number(value) * 1000 * 60 : null;

export default class FilterDuration extends React.PureComponent<Props, State> {
  state: State = { focused: false };

  onChange = ({
    target: { name, value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange } = this.props;
    if (onChange) {
      onChange({ [name]: toMs(value) } as Values);
    }
  };

  onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { onEnterPress } = this.props;
    if (e.key === 'Enter' && onEnterPress) {
      onEnterPress(e);
    }
  };

  render() {
    const { minDuration, maxDuration, isConditional, onBlur } = this.props;
    return (
      <div className={styles.wrapper}>
        <div className="flex items-center">
          <span className={styles.label}>Min</span>
          <Input
            min={1}
            type="number"
            placeholder="0 min"
            name="minDuration"
            value={fromMs(minDuration)}
            onChange={this.onChange}
            onKeyPress={this.onKeyPress}
            onFocus={() => this.setState({ focused: true })}
            onBlur={onBlur}
            style={{ height: 26, width: 90 }}
          />
        </div>
        {!isConditional && (
          <div className="flex items-center">
            <span className={styles.label}>Max</span>
            <Input
              min={1}
              type="number"
              placeholder="∞ min"
              name="maxDuration"
              value={fromMs(maxDuration)}
              onChange={this.onChange}
              onKeyPress={this.onKeyPress}
              onFocus={() => this.setState({ focused: true })}
              onBlur={onBlur}
              style={{ height: 26, width: 90 }}
            />
          </div>
        )}
      </div>
    );
  }
}
