import { Input, Label } from 'semantic-ui-react';
import styles from './FilterDuration.css';

const fromMs = value => value ? `${ value / 1000 / 60 }` : ''
const toMs = value => value !== '' ? value * 1000 * 60 : null

export default class FilterDuration extends React.PureComponent {
  state = { focused: false }
  onChange = (e, { name, value }) => {
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
    } = this.props;

    return (
      <div className={ styles.wrapper }>
        <Input
          labelPosition="left"
          type="number"
          placeholder="0 min"
          name="minDuration"
          value={ fromMs(minDuration) }
          onChange={ this.onChange }
          // className="customInput"
          onKeyPress={ this.onKeyPress }
          onFocus={() => this.setState({ focused: true })}
          onBlur={this.props.onBlur}
        >
          <Label basic className={ styles.label }>{ 'Min' }</Label>
          <input min="1" />
        </Input>
        <Input
          labelPosition="left"
          type="number"
          placeholder="∞ min"
          name="maxDuration"
          value={ fromMs(maxDuration) }
          onChange={ this.onChange }
          // className="customInput"
          onKeyPress={ this.onKeyPress }
          onFocus={() => this.setState({ focused: true })}
          onBlur={this.props.onBlur}
        >
          <Label basic className={ styles.label }>{ 'Max' }</Label>
          <input min="1" />
        </Input>
      </div>
    );
  }
}
