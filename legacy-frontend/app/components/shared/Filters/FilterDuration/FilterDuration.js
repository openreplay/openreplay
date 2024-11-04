import React from 'react';
import styles from './FilterDuration.module.css';
import { Input } from 'UI'

const fromMs = value => value ? `${ value / 1000 / 60 }` : ''
const toMs = value => value !== '' ? value * 1000 * 60 : null

export default class FilterDuration extends React.PureComponent {
  state = { focused: false }
  onChange = ({ target: { name, value }}) => {
    const { onChange } = this.props;
    if (typeof onChange === 'function') {
      onChange({
        [ name ]: toMs(value),
      });
    }
  }

  onKeyPress = e => {
    const { onEnterPress } = this.props;
    if (e.key === 'Enter' && typeof onEnterPress === 'function') {
      onEnterPress(e);
    }
  }

  render() {
    const {
      minDuration,
      maxDuration,
      isConditional,
    } = this.props;

    return (
      <div className={styles.wrapper}>
        <div className="flex items-center">
          <span basic className={styles.label}>
            {'Min'}
          </span>
          <Input
            min="1"
            type="number"
            placeholder="0 min"
            name="minDuration"
            value={fromMs(minDuration)}
            onChange={this.onChange}
            onKeyPress={this.onKeyPress}
            onFocus={() => this.setState({ focused: true })}
            onBlur={this.props.onBlur}
            style={{ height: '26px', width: '90px' }}
          />
        </div>
        {isConditional ? null : (
          <div className="flex items-center">
            <span basic className={styles.label}>
              {'Max'}
            </span>
            <Input
              min="1"
              type="number"
              placeholder="∞ min"
              name="maxDuration"
              value={fromMs(maxDuration)}
              onChange={this.onChange}
              onKeyPress={this.onKeyPress}
              onFocus={() => this.setState({ focused: true })}
              onBlur={this.props.onBlur}
              style={{ height: '26px', width: '90px' }}
            />
          </div>)
        }
      </div>
    );
  }
}
