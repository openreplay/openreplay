import { storiesOf } from '@storybook/react';
import SplitButton from './SplitButton';

storiesOf('SplitButton', module)
  .add('Pure', () => (
    <SplitButton label="Issues" primary icon="plus" />
  ))

