import { storiesOf } from '@storybook/react';
import IconButton from '.';

storiesOf('IconButton', module)
  .add('Pure', () => (
    <IconButton />
  ))
  .add('Icon', () => (
    <IconButton icon="cog" />
  ))
  .add('Icon & Label', () => (
    <IconButton icon="cog" label="Button" />
  ))
  .add('Plain', () => (
    <IconButton icon="cog" label="Button" plain />
  ))
  .add('Primary', () => (
    <IconButton icon="cog" label="Button" primary />
  ))

