import { storiesOf } from '@storybook/react';
import Icon from '.';

storiesOf('Icon', module)
  .add('Pure', () => (
    <Icon />
  ))
  .add('Icon', () => (
    <Icon name="close" />
  ))
  .add('Icon Size 16', () => (
    <Icon name="close" size="16" />
  ))

